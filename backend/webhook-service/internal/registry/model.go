package registry

import (
	"time"

	"github.com/google/uuid"
)

type Webhook struct {
	ID             uuid.UUID `json:"id"`
	OrganizationID string    `json:"organizationId"`
	URL            string    `json:"url"`
	Secret         string    `json:"secret,omitempty"`
	Events         []string  `json:"events"`
	Active         bool      `json:"active"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type CreateInput struct {
	URL    string   `json:"url"`
	Secret string   `json:"secret"`
	Events []string `json:"events"`
}

type UpdateInput struct {
	URL    *string  `json:"url"`
	Secret *string  `json:"secret"`
	Events []string `json:"events"`
	Active *bool    `json:"active"`
}
