package sql

type SQLStatement interface {
	StatementType() string
}

type ColumnDefinition struct {
	Name string `json:"name"`
	Type string `json:"type"` // "TEXT", "INT", "FLOAT", "BOOL"
}

type WhereClause struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"` // "=", "!=", ">", "<", ">=", "<="
	Value    interface{} `json:"value"`
}

type CreateTableStatement struct {
	TableName string             `json:"table_name"`
	Columns   []ColumnDefinition `json:"columns"`
}

func (s *CreateTableStatement) StatementType() string { return "CREATE_TABLE" }

type InsertStatement struct {
	TableName string        `json:"table_name"`
	Values    []interface{} `json:"values"`
}

func (s *InsertStatement) StatementType() string { return "INSERT" }

type SelectStatement struct {
	TableName string       `json:"table_name"`
	Fields    []string     `json:"fields"` // "*" or individual columns
	Where     *WhereClause `json:"where"`
	Limit     int          `json:"limit"` // -1 for no limit
}

func (s *SelectStatement) StatementType() string { return "SELECT" }
