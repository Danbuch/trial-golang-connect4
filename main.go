package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type Connect4Data struct {
	Board         [6][7]string `json:"board"`
	CurrentPlayer string       `json:"currentPlayer"`
	Winner        string       `json:"winner"`
	MoveHistory   []int        `json:"moveHistory"`
}

type Data struct {
	C4 Connect4Data `json:"c4"`
}

func S4() string {
	return fmt.Sprintf("%04x", rand.Intn(0x10000))
}

// GenerateUUID generates a UUID-like string using S4
func GenerateUUID() string {
	return fmt.Sprintf("%s%s-%s-%s-%s-%s%s%s", S4(), S4(), S4(), S4(), S4(), S4(), S4(), S4())
}

var data = map[string]Data{
	"c4": {
		C4: Connect4Data{
			Board: [6][7]string{
				{"", "", "", "", "", "", ""},
				{"", "", "", "", "", "", ""},
				{"", "", "", "", "", "", ""},
				{"", "", "", "", "", "", ""},
				{"", "", "", "", "", "", ""},
				{"", "", "", "", "", "", ""},
			},
			CurrentPlayer: "red",
			Winner:        "",
			MoveHistory:   []int{},
		},
	},
}

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			uuid := GenerateUUID()
			fmt.Println("Generated UUID:", uuid)
			return next(c)
		}
	})

	// Middleware to check the Referer or Origin header
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip check for static files
			if strings.HasPrefix(c.Path(), "/static") {
				return next(c)
			}

			origin := c.Request().Header.Get("Origin")
			referer := c.Request().Header.Get("Referer")

			// Allow requests from the static site
			if origin == "http://localhost:8080" || strings.HasPrefix(referer, "http://localhost:8080/static") {
				return next(c)
			}

			return c.JSON(http.StatusForbidden, map[string]string{"error": "forbidden"})
		}
	})

	// Middleware to check for API key
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Skip API key check for static files
			if strings.HasPrefix(c.Path(), "/static") {
				return next(c)
			}

			apiKey := c.Request().Header.Get("X-API-Key")
			expectedAPIKey := os.Getenv("api-key")

			// Key missing
			if apiKey == "" {
				return c.JSON(http.StatusBadRequest, map[string]string{"error": "api key required"})
			}

			// Key wrong
			if apiKey != expectedAPIKey {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid api key"})
			}

			// Key correct
			return next(c)
		}
	})

	// Serve static files
	e.Static("/static", "static")

	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"message": "Hello, Docker! <3",
		})
	})

	// GET endpoint to retrieve data by id
	e.GET("/api/data/:id", func(c echo.Context) error {
		id := c.Param("id")
		if result, exists := data[id]; exists {
			return c.JSON(http.StatusOK, result)
		}
		return c.JSON(http.StatusNotFound, map[string]string{"error": "data not found"})
	})

	// PUT endpoint to update the data
	e.PUT("/api/data/:id", func(c echo.Context) error {
		id := c.Param("id")
		if _, exists := data[id]; exists {
			var newData Data
			fmt.Println("Data:", data[id])
			fmt.Println("New data:", newData)
			if err := c.Bind(&newData); err != nil {
				return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid data"})
			}
			data[id] = newData
			return c.JSON(http.StatusOK, newData)
		}
		return c.JSON(http.StatusNotFound, map[string]string{"error": "data not found"})
	})

	httpPort := os.Getenv("PORT")
	if httpPort == "" {
		httpPort = "8080"
	}

	e.Logger.Fatal(e.Start(":" + httpPort))
}
