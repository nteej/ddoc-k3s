package jwt

import (
	"crypto/rsa"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID           string `json:"userId"`
	Name             string `json:"name"`
	OrganizationID   string `json:"organizationId"`
	OrganizationSlug string `json:"organizationSlug"`
	Role             string `json:"role"`
	jwt.RegisteredClaims
}

type Signer struct {
	privateKey *rsa.PrivateKey
	ttl        time.Duration
}

func NewSigner(privateKeyPath string, ttl time.Duration) (*Signer, error) {
	data, err := os.ReadFile(privateKeyPath)
	if err != nil {
		return nil, err
	}
	key, err := jwt.ParseRSAPrivateKeyFromPEM(data)
	if err != nil {
		return nil, err
	}
	return &Signer{privateKey: key, ttl: ttl}, nil
}

// Sign creates a short-lived JWT identical in shape to user-service tokens.
// The 'iss' claim must match what Kong's JWT plugin expects ("user-service").
func (s *Signer) Sign(keyID, orgID, orgSlug, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:           "api-key:" + keyID,
		Name:             "API Key",
		OrganizationID:   orgID,
		OrganizationSlug: orgSlug,
		Role:             role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "user-service",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(s.privateKey)
}
