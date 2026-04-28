package sse

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type Notification struct {
	Type  string                 `json:"type"`
	Title string                 `json:"title"`
	Body  string                 `json:"body"`
	Data  map[string]interface{} `json:"data,omitempty"`
}

type Hub struct {
	mu          sync.RWMutex
	subscribers map[string][]chan Notification
}

func NewHub() *Hub {
	return &Hub{subscribers: make(map[string][]chan Notification)}
}

func (h *Hub) Subscribe(userID string) (<-chan Notification, func()) {
	ch := make(chan Notification, 16)
	h.mu.Lock()
	h.subscribers[userID] = append(h.subscribers[userID], ch)
	h.mu.Unlock()

	cancel := func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		chans := h.subscribers[userID]
		for i, c := range chans {
			if c == ch {
				h.subscribers[userID] = append(chans[:i], chans[i+1:]...)
				close(ch)
				break
			}
		}
		if len(h.subscribers[userID]) == 0 {
			delete(h.subscribers, userID)
		}
	}
	return ch, cancel
}

func (h *Hub) Publish(userID string, n Notification) {
	h.mu.RLock()
	chans := make([]chan Notification, len(h.subscribers[userID]))
	copy(chans, h.subscribers[userID])
	h.mu.RUnlock()

	for _, ch := range chans {
		select {
		case ch <- n:
		default:
		}
	}
}

func (h *Hub) ServeSSE(w http.ResponseWriter, r *http.Request, userID string) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch, cancel := h.Subscribe(userID)
	defer cancel()

	fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
	flusher.Flush()

	for {
		select {
		case <-r.Context().Done():
			return
		case n, ok := <-ch:
			if !ok {
				return
			}
			data, _ := json.Marshal(n)
			fmt.Fprintf(w, "event: notification\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}
