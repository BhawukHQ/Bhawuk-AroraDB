package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "ardb",
		Short: "AroraDB CLI",
		Long:  `ardb is the command line interface for AroraDB.`,
	}

	var clusterCmd = &cobra.Command{
		Use:   "cluster",
		Short: "Manage AroraDB cluster",
	}

	var statusCmd = &cobra.Command{
		Use:   "status",
		Short: "Get cluster status",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Cluster Health: OK (3/3 nodes healthy)")
		},
	}

	var queryCmd = &cobra.Command{
		Use:   "query [SQL_QUERY]",
		Short: "Execute a SQL query",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			query := args[0]
			fmt.Printf("Executing query: %s\n", query)
			fmt.Println("Mock SQL Response: { \"rows\": [] }")
		},
	}

	clusterCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(clusterCmd)
	rootCmd.AddCommand(queryCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
