export interface LanguageConfig {
  id: string;
  name: string;
  displayName: string;
  extensions: string[];
  icon: string;
  color: string;
  supportsExecution: boolean;
  supportsFormatting: boolean;
  supportsLinting: boolean;
  defaultTemplate: string;
  keywords: string[];
  operators: string[];
  builtins: string[];
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    displayName: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    icon: 'TS',
    color: '#3178C6',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// TypeScript Example
interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const user: User = {
  id: 1,
  name: 'Developer',
  email: 'dev@example.com'
};

console.log(greetUser(user));`,
    keywords: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'namespace', 'import', 'export', 'default', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends', 'implements', 'public', 'private', 'protected', 'static', 'readonly'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '??', '?.'],
    builtins: ['console', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet'],
  },
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    displayName: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs'],
    icon: 'JS',
    color: '#F7DF1E',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// JavaScript Example
function greetUser(user) {
  return \`Hello, \${user.name}!\`;
}

const user = {
  id: 1,
  name: 'Developer',
  email: 'dev@example.com'
};

console.log(greetUser(user));`,
    keywords: ['const', 'let', 'var', 'function', 'class', 'import', 'export', 'default', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '??', '?.'],
    builtins: ['console', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet'],
  },
  python: {
    id: 'python',
    name: 'Python',
    displayName: 'Python',
    extensions: ['.py', '.pyw'],
    icon: 'PY',
    color: '#3776AB',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `# Python Example
def greet_user(user):
    return f"Hello, {user['name']}!"

user = {
    'id': 1,
    'name': 'Developer',
    'email': 'dev@example.com'
}

print(greet_user(user))`,
    keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'yield', 'async', 'await', 'pass', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is'],
    operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not', 'in', 'is'],
    builtins: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'open', 'input', 'map', 'filter', 'zip', 'enumerate'],
  },
  java: {
    id: 'java',
    name: 'Java',
    displayName: 'Java',
    extensions: ['.java'],
    icon: 'JAVA',
    color: '#007396',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// Java Example
public class Main {
    public static void main(String[] args) {
        User user = new User(1, "Developer", "dev@example.com");
        System.out.println(greetUser(user));
    }
    
    public static String greetUser(User user) {
        return "Hello, " + user.getName() + "!";
    }
}

class User {
    private int id;
    private String name;
    private String email;
    
    public User(int id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
    
    public String getName() {
        return name;
    }
}`,
    keywords: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'new', 'this', 'super', 'import', 'package', 'abstract', 'synchronized', 'volatile', 'transient'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '++', '--'],
    builtins: ['System', 'String', 'Integer', 'Double', 'Boolean', 'ArrayList', 'HashMap', 'List', 'Map', 'Set'],
  },
  go: {
    id: 'go',
    name: 'Go',
    displayName: 'Go',
    extensions: ['.go'],
    icon: 'GO',
    color: '#00ADD8',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// Go Example
package main

import "fmt"

type User struct {
    ID    int
    Name  string
    Email string
}

func greetUser(user User) string {
    return fmt.Sprintf("Hello, %s!", user.Name)
}

func main() {
    user := User{
        ID:    1,
        Name:  "Developer",
        Email: "dev@example.com",
    }
    fmt.Println(greetUser(user))
}`,
    keywords: ['package', 'import', 'func', 'type', 'struct', 'interface', 'var', 'const', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'return', 'go', 'defer', 'select', 'chan', 'map'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', ':=', '<-'],
    builtins: ['fmt', 'len', 'cap', 'make', 'new', 'append', 'copy', 'delete', 'panic', 'recover', 'print', 'println'],
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    displayName: 'Rust',
    extensions: ['.rs'],
    icon: 'RS',
    color: '#CE422B',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// Rust Example
struct User {
    id: i32,
    name: String,
    email: String,
}

fn greet_user(user: &User) -> String {
    format!("Hello, {}!", user.name)
}

fn main() {
    let user = User {
        id: 1,
        name: String::from("Developer"),
        email: String::from("dev@example.com"),
    };
    println!("{}", greet_user(&user));
}`,
    keywords: ['fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl', 'type', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'async', 'await', 'move', 'ref'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '<<', '>>', '..', '...'],
    builtins: ['Vec', 'String', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'println', 'format', 'panic'],
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    displayName: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    icon: 'C++',
    color: '#00599C',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// C++ Example
#include <iostream>
#include <string>

class User {
public:
    int id;
    std::string name;
    std::string email;
    
    User(int id, std::string name, std::string email)
        : id(id), name(name), email(email) {}
};

std::string greetUser(const User& user) {
    return "Hello, " + user.name + "!";
}

int main() {
    User user(1, "Developer", "dev@example.com");
    std::cout << greetUser(user) << std::endl;
    return 0;
}`,
    keywords: ['class', 'struct', 'public', 'private', 'protected', 'virtual', 'override', 'const', 'static', 'inline', 'namespace', 'using', 'template', 'typename', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return', 'try', 'catch', 'throw', 'new', 'delete', 'this', 'nullptr'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '<<', '>>', '++', '--', '->', '.', '::'],
    builtins: ['std', 'cout', 'cin', 'endl', 'string', 'vector', 'map', 'set', 'pair', 'make_pair'],
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    displayName: 'Swift',
    extensions: ['.swift'],
    icon: 'SWIFT',
    color: '#FA7343',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// Swift Example
struct User {
    let id: Int
    let name: String
    let email: String
}

func greetUser(_ user: User) -> String {
    return "Hello, \\(user.name)!"
}

let user = User(
    id: 1,
    name: "Developer",
    email: "dev@example.com"
)

print(greetUser(user))`,
    keywords: ['let', 'var', 'func', 'class', 'struct', 'enum', 'protocol', 'extension', 'if', 'else', 'guard', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return', 'import', 'public', 'private', 'internal', 'fileprivate', 'static', 'mutating', 'async', 'await', 'throws', 'try', 'catch'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '??', '...', '..<'],
    builtins: ['print', 'Array', 'Dictionary', 'Set', 'String', 'Int', 'Double', 'Bool', 'Optional'],
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    displayName: 'Kotlin',
    extensions: ['.kt', '.kts'],
    icon: 'KT',
    color: '#7F52FF',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `// Kotlin Example
data class User(
    val id: Int,
    val name: String,
    val email: String
)

fun greetUser(user: User): String {
    return "Hello, \${user.name}!"
}

fun main() {
    val user = User(
        id = 1,
        name = "Developer",
        email = "dev@example.com"
    )
    println(greetUser(user))
}`,
    keywords: ['fun', 'val', 'var', 'class', 'data', 'object', 'interface', 'if', 'else', 'when', 'for', 'while', 'break', 'continue', 'return', 'import', 'package', 'public', 'private', 'protected', 'internal', 'open', 'abstract', 'override', 'suspend', 'inline', 'try', 'catch', 'finally', 'throw'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '?:', '!!', '..', 'in'],
    builtins: ['println', 'print', 'listOf', 'mapOf', 'setOf', 'arrayOf', 'let', 'apply', 'run', 'with', 'also'],
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    displayName: 'Ruby',
    extensions: ['.rb'],
    icon: 'RB',
    color: '#CC342D',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `# Ruby Example
class User
  attr_reader :id, :name, :email
  
  def initialize(id, name, email)
    @id = id
    @name = name
    @email = email
  end
end

def greet_user(user)
  "Hello, #{user.name}!"
end

user = User.new(1, "Developer", "dev@example.com")
puts greet_user(user)`,
    keywords: ['def', 'class', 'module', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'for', 'while', 'until', 'break', 'next', 'return', 'yield', 'begin', 'rescue', 'ensure', 'end', 'do', 'then', 'self', 'super', 'nil', 'true', 'false', 'and', 'or', 'not'],
    operators: ['+', '-', '*', '/', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '..', '...', '=>'],
    builtins: ['puts', 'print', 'p', 'gets', 'Array', 'Hash', 'String', 'Integer', 'Float', 'Symbol', 'Range'],
  },
  php: {
    id: 'php',
    name: 'PHP',
    displayName: 'PHP',
    extensions: ['.php'],
    icon: 'PHP',
    color: '#777BB4',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `<?php
// PHP Example
class User {
    public $id;
    public $name;
    public $email;
    
    public function __construct($id, $name, $email) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
    }
}

function greetUser($user) {
    return "Hello, {$user->name}!";
}

$user = new User(1, "Developer", "dev@example.com");
echo greetUser($user);
?>`,
    keywords: ['class', 'function', 'public', 'private', 'protected', 'static', 'final', 'abstract', 'interface', 'extends', 'implements', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'self', 'parent', 'namespace', 'use'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '.', '=>', '->'],
    builtins: ['echo', 'print', 'var_dump', 'print_r', 'array', 'count', 'strlen', 'substr', 'explode', 'implode', 'isset', 'empty', 'unset'],
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    displayName: 'SQL',
    extensions: ['.sql'],
    icon: 'SQL',
    color: '#00758F',
    supportsExecution: true,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `-- SQL Example
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email) VALUES
    ('Developer', 'dev@example.com'),
    ('Designer', 'design@example.com');

SELECT * FROM users WHERE email LIKE '%@example.com';`,
    keywords: ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'UNION', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL'],
    operators: ['=', '!=', '<', '>', '<=', '>=', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN'],
    builtins: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING', 'UPPER', 'LOWER', 'TRIM', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY'],
  },
  json: {
    id: 'json',
    name: 'JSON',
    displayName: 'JSON',
    extensions: ['.json'],
    icon: 'JSON',
    color: '#5E5C5C',
    supportsExecution: false,
    supportsFormatting: true,
    supportsLinting: true,
    defaultTemplate: `{
  "user": {
    "id": 1,
    "name": "Developer",
    "email": "dev@example.com",
    "roles": ["admin", "developer"],
    "settings": {
      "theme": "dark",
      "notifications": true
    }
  }
}`,
    keywords: [],
    operators: [],
    builtins: [],
  },
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    displayName: 'Markdown',
    extensions: ['.md', '.markdown'],
    icon: 'MD',
    color: '#083FA1',
    supportsExecution: false,
    supportsFormatting: true,
    supportsLinting: false,
    defaultTemplate: `# Welcome to Markdown

## Features

- **Bold text**
- *Italic text*
- \`Inline code\`
- [Links](https://example.com)

### Code Block

\`\`\`typescript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

> This is a blockquote

1. First item
2. Second item
3. Third item`,
    keywords: [],
    operators: [],
    builtins: [],
  },
};

export function getLanguageFromExtension(filename: string): LanguageConfig {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  
  for (const lang of Object.values(SUPPORTED_LANGUAGES)) {
    if (lang.extensions.includes(ext)) {
      return lang;
    }
  }
  
  return SUPPORTED_LANGUAGES.typescript;
}

export function getLanguageById(id: string): LanguageConfig | undefined {
  return SUPPORTED_LANGUAGES[id];
}

export function getAllLanguages(): LanguageConfig[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

export function formatCode(code: string, language: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const indentSize = 2;
  
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    
    if (!trimmed) return '';
    
    if (trimmed.match(/^[\}\]\)]/) || trimmed.match(/^(end|fi|done|esac)$/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    const formatted = ' '.repeat(indentLevel * indentSize) + trimmed;
    
    if (trimmed.match(/[\{\[\(]$/) || trimmed.match(/^(if|for|while|def|class|function|do|then|case)[\s\(]/)) {
      indentLevel++;
    }
    
    return formatted;
  });
  
  return formattedLines.join('\n');
}

export function highlightSyntax(code: string, language: LanguageConfig): string {
  return code;
}
