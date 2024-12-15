package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

func generateAPIKey() (string, error) {
	bytes := make([]byte, 32) // 32 bytes = 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func keygen() {
	apiKey, err := generateAPIKey()
	if err != nil {
		fmt.Println("Error generating API key:", err)
		return
	}
	fmt.Println("Generated API key:", apiKey)
}

func main() {
	keygen()
}
