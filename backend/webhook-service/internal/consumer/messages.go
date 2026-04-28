package consumer

import "encoding/json"

type WebhookDispatch struct {
	Event          string          `json:"event"`
	OrganizationID string          `json:"organizationId"`
	FileID         string          `json:"fileId"`
	FileName       string          `json:"fileName"`
	TemplateID     string          `json:"templateId"`
	Timestamp      string          `json:"timestamp"`
	Errors         json.RawMessage `json:"errors,omitempty"`
}

type NotificationDispatch struct {
	Type           string                 `json:"type"`
	OrganizationID string                 `json:"organizationId"`
	UserID         string                 `json:"userId"`
	Title          string                 `json:"title"`
	Body           string                 `json:"body"`
	Data           map[string]interface{} `json:"data"`
}
