package utils

import "github.com/matthewhartstonge/argon2"

var ARGON2 = argon2.DefaultConfig()

func Hash(input []byte) ([]byte, error) {
	return ARGON2.HashEncoded(input)
}
func CompareHash(a []byte, b []byte) (bool, error) {
	return argon2.VerifyEncoded(a, b)
}
