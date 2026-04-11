# Design Document: Shop Floor Dashboard MVP

## Overview

The Shop Floor Dashboard is a real-time production monitoring web application built with Flask (backend) and vanilla JavaScript (frontend). The system provides two distinct operating modes:

1. **TV Mode**: A zero-touch, auto-refreshing display optimized for large screens and distance viewing
2. **Supervisor Mode**: An interactive interface with data entry, editing, and analytical capabilities

### Key Design Principles

- **Separation of Concerns**: Clear boundaries between backend API, frontend presentation, and data persistence layers
- **Real-time Updates**: Polling-based architecture with 30-second refresh intervals to maintain current data without page reloads
- **Mode-Specific UX**: Distinct UI/UX patterns optimized for passive monitoring vs. active management
- **Responsive Design**: Mobile-first approach using Tailwind CSS for cross-device compatibility
- **Branding Consistency**: Sonoco color scheme (dark blue + lime green) applied throughout

### Technology Stack

- **Backend**: Flask 3.x with Flask-CORS, SQLAlchemy 2.x ORM
- **Database**: PostgreSQL 14+
- **Frontend**: Vanilla JavaScript (ES6+), no framework dependencies
- **Visualization**: Chart.js 4.x for pacing and efficiency charts
- **Styling**: Tailwind CSS 3.x via CDN
- **HTTP Client**: Native Fetch API

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        TV[TV Mode UI]
        SUP[Supervisor Mode UI]
        CHART[Chart.js Visualizations]
        THEME[Theme Switcher]
    end
    
    subgraph "Backend Layer"
        API[Flask REST API]
        BL[Business Logic Layer]
        ORM[SQLAlchemy ORM]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
        SEED[Seeder Script]
    end
    
    TV -->|HTTP GET /api/production-orders| API
    TV -->|HTTP GET /api/machines| API
    SUP -->|HTTP GET/POST/PUT| API
    SUP --> CHART
    TV --> THEME
    
    API --> BL
    BL --> ORM
    ORM --> DB
    SEED -->|Populate| DB
    
    style TV fill:#1e3a8a
    style SUP fill:#1e3a8a
    style API fill:#84cc16
    style DB fill:#374151
```

### Architectural Patterns

**Three-Tier Architecture**:
- **Presentation Tier**: Vanilla JavaScript frontend with mode-specific rendering
- **Application Tier**: Flask REST API with business logic for calculations
- **Data Tier**: PostgreSQL with SQLAlchemy ORM abstraction

**Polling-Based Real-Time Updates**:
- Frontend initiates periodic GET requests every 30 seconds
- No WebSocket or Server-Sent Events in MVP
- Stateless API design for horizontal scalability

**Mode Separation**:
- Single backend serves both modes
- Frontend routes determine which UI components to render
- TV Mode: `/tv` route with auto-refresh and large typography
- Supervisor Mode: `/supervisor` route with interactive controls

## Components and Interfaces

### Backend Components

#### 1. Flask Application (`app.py`)

**Responsibilities**:
- Application initialization and configuration
- Route registration
- CORS configuration
- Static file serving
- Database connection management

**Key Configuration**:
```python
SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/shopfloor')
SQLALCHEMY_TRACK_MODIFICATIONS = False
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
```

#### 2. Database Models (`models.py`)

**Machine Model**:
```python
class Machine(db.Model):
    __tablename__ = 'mst_machine'
    id: int (PK)
    machine_code: str (unique, not null)
    machine_name: str (not null)
    is_active: bool (default=True)
```

**ProductionOrder Model**:
```python
class ProductionOrder(db.Model):
    __tablename__ = 'trx_production_order'
    id: int (PK)
    machine_id: int (FK -> mst_machine.id)
    shift_name: str (not null)
    order_date: date (not null)
    target_qty: int (not null, >= 0)
    completed_qty: int (not null, >= 0)
    wip_qty: int (not null, >= 0)
    created_at: datetime (default=now)
    
    # Relationship
    machine: Machine (backref='production_orders')
```

**Serialization Methods**:
- `to_dict()`: Converts model instance to JSON-serializable dictionary
- Includes calculated fields: `pending_qty`, `efficiency_percent`

#### 3. API Routes (`routes.py`)

**Machine Endpoints**:
- `GET /api/machines`: List all active machines
  - Response: `[{id, machine_code, machine_name, is_active}]`

**Production Order Endpoints**:
- `GET /api/production-orders`: List all production orders with calculations
  - Response: `[{id, machine_id, machine_name, shift_name, order_date, target_qty, completed_qty, wip_qty, pending_qty, efficiency_percent, created_at}]`
  
- `GET /api/production-orders/<id>`: Get single production order
  - Response: `{id, machine_id, ...}` or 404
  
- `POST /api/production-orders`: Create new production order
  - Request: `{machine_id, shift_name, order_date, target_qty, completed_qty, wip_qty}`
  - Response: Created object with 201 status
  - Validation: All required fields, quantities >= 0
  
- `PUT /api/production-orders/<id>`: Update existing production order
  - Request: `{completed_qty?, wip_qty?, ...}` (partial updates allowed)
  - Response: Updated object or 404
  - Validation: Quantities >= 0

**Health Check**:
- `GET /api/health`: Returns `{status: "ok"}` with 200 status

#### 4. Business Logic Layer (`services.py`)

**CalculationService**:
```python
@staticmethod
def calculate_pending_qty(target_qty, completed_qty, wip_qty):
    return target_qty - completed_qty - wip_qty

@staticmethod
def calculate_efficiency_percent(completed_qty, target_qty):
    if target_qty == 0:
        return 0.0
    return round((completed_qty / target_qty) * 100, 2)
```

**ValidationService**:
- Validates production order data before persistence
- Ensures quantities are non-negative
- Validates foreign key references (machine_id exists)
- Validates date formats

#### 5. Database Seeder (`seed.py`)

**Responsibilities**:
- Clear existing data (truncate tables)
- Create 5+ machine records with realistic codes/names
- Create 20+ production orders across machines and shifts
- Generate varied efficiency scenarios (below/on/above target)

**Sample Data Strategy**:
- Machines: "CNC-001", "PRESS-002", "WELD-003", "PACK-004", "QC-005"
- Shifts: "Morning", "Afternoon", "Night"
- Target quantities: Range from 100 to 1000 units
- Completion rates: 50% to 120% of target for variety

### Frontend Components

#### 1. Main Application (`app.js`)

**Responsibilities**:
- Mode detection from URL path
- Router initialization
- Global state management
- API client initialization

**Mode Detection**:
```javascript
const mode = window.location.pathname.includes('/tv') ? 'tv' : 'supervisor';
```

#### 2. API Client (`api.js`)

**Methods**:
- `fetchMachines()`: GET /api/machines
- `fetchProductionOrders()`: GET /api/production-orders
- `fetchProductionOrder(id)`: GET /api/production-orders/{id}
- `createProductionOrder(data)`: POST /api/production-orders
- `updateProductionOrder(id, data)`: PUT /api/production-orders/{id}

**Error Handling**:
- Network errors: Retry with exponential backoff (3 attempts)
- HTTP errors: Parse error message from response body
- Timeout: 10-second request timeout

#### 3. TV Mode Component (`tv-mode.js`)

**Responsibilities**:
- Render large-format production metrics
- Auto-refresh every 30 seconds
- Theme switching based on time of day
- Shift handover event detection and display
- No user interaction handling

**Layout**:
- Grid layout: 2-3 columns depending on screen size
- Large typography: 24px+ for readability from distance
- Color-coded efficiency: Green (>90%), Yellow (70-90%), Red (<70%)

**Auto-Refresh Logic**:
```javascript
setInterval(async () => {
    const orders = await api.fetchProductionOrders();
    renderOrders(orders);
}, 30000);
```

**Shift Handover Event**:
- Triggers 15 minutes before shift end time
- Hides normal dashboard display
- Shows full-screen motivational overlay with:
  - Current shift's final production summary
  - Gratitude message to outgoing shift
  - Welcome message to incoming shift
- Shift times: Morning (6 AM - 2 PM), Afternoon (2 PM - 10 PM), Night (10 PM - 6 AM)
- Handover windows: 1:45 PM, 9:45 PM, 5:45 AM
- Returns to normal dashboard after shift transition completes

#### 4. Supervisor Mode Component (`supervisor-mode.js`)

**Responsibilities**:
- Render interactive production order table
- Handle form submissions (create/update)
- Display detailed order information on click
- Integrate Chart.js visualizations
- Manual refresh button

**Interactive Features**:
- Click row to expand details
- Inline editing for completed_qty and wip_qty
- Modal forms for creating new orders
- Real-time validation feedback

#### 5. Theme Switcher (`theme.js`)

**Responsibilities**:
- Detect current time
- Apply dark theme (6 PM - 6 AM) or light theme (6 AM - 6 PM)
- Toggle Tailwind CSS classes on root element

**Implementation**:
```javascript
function applyTheme() {
    const hour = new Date().getHours();
    const isDark = hour >= 18 || hour < 6;
    document.documentElement.classList.toggle('dark', isDark);
}
```

#### 6. Chart Component (`charts.js`)

**Responsibilities**:
- Initialize Chart.js instances
- Render pacing line charts (completed_qty over time)
- Render efficiency bar charts (comparison across orders)
- Update charts when data changes

**Chart Types**:

**Pacing Line Chart**:
- X-axis: Time (hourly intervals)
- Y-axis: Completed quantity
- Multiple lines: One per production order
- Target line: Horizontal line at target_qty

**Efficiency Bar Chart**:
- X-axis: Production order ID or machine name
- Y-axis: Efficiency percentage (0-100%)
- Color coding: Green (>90%), Yellow (70-90%), Red (<70%)

## Data Models

### Database Schema

```sql
-- Machine Master Table
CREATE TABLE mst_machine (
    id SERIAL PRIMARY KEY,
    machine_code VARCHAR(50) UNIQUE NOT NULL,
    machine_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Production Order Transaction Table
CREATE TABLE trx_production_order (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES mst_machine(id) ON DELETE CASCADE,
    shift_name VARCHAR(20) NOT NULL,
    order_date DATE NOT NULL,
    target_qty INTEGER NOT NULL CHECK (target_qty >= 0),
    completed_qty INTEGER NOT NULL CHECK (completed_qty >= 0),
    wip_qty INTEGER NOT NULL CHECK (wip_qty >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_production_order_machine ON trx_production_order(machine_id);
CREATE INDEX idx_production_order_date ON trx_production_order(order_date);
```

### Data Flow

**Read Flow (TV Mode & Supervisor Mode)**:
1. Frontend sends GET request to `/api/production-orders`
2. Flask route handler calls service layer
3. Service queries database via SQLAlchemy ORM
4. For each ProductionOrder:
   - Calculate `pending_qty = target_qty - completed_qty - wip_qty`
   - Calculate `efficiency_percent = (completed_qty / target_qty) * 100`
5. Serialize models to JSON with calculated fields
6. Return JSON response to frontend
7. Frontend updates DOM with new data

**Write Flow (Supervisor Mode)**:
1. User submits form (create or update)
2. Frontend validates input client-side
3. Frontend sends POST/PUT request with JSON payload
4. Flask route handler validates request data
5. ValidationService checks business rules
6. Create/update model instance via SQLAlchemy
7. Commit transaction to database
8. Return serialized object to frontend
9. Frontend updates UI and displays success message

### API Request/Response Examples

**GET /api/production-orders Response**:
```json
[
  {
    "id": 1,
    "machine_id": 1,
    "machine_name": "CNC-001",
    "shift_name": "Morning",
    "order_date": "2024-01-15",
    "target_qty": 500,
    "completed_qty": 450,
    "wip_qty": 30,
    "pending_qty": 20,
    "efficiency_percent": 90.0,
    "created_at": "2024-01-15T08:00:00"
  }
]
```

**POST /api/production-orders Request**:
```json
{
  "machine_id": 2,
  "shift_name": "Afternoon",
  "order_date": "2024-01-15",
  "target_qty": 300,
  "completed_qty": 0,
  "wip_qty": 0
}
```

**Error Response (400)**:
```json
{
  "error": "Validation failed",
  "details": {
    "target_qty": "Must be a non-negative integer"
  }
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ORM Serialization Round-Trip

*For any* valid Machine or ProductionOrder model instance, serializing to JSON via `to_dict()` and then reconstructing from that dictionary SHALL produce an object with equivalent field values.

**Validates: Requirements 1.5**

### Property 2: Pending Quantity Calculation

*For any* production order with target_qty, completed_qty, and wip_qty values, the calculated pending_qty SHALL equal (target_qty - completed_qty - wip_qty).

**Validates: Requirements 3.1**

### Property 3: Efficiency Percentage Calculation

*For any* production order where target_qty > 0, the calculated efficiency_percent SHALL equal (completed_qty / target_qty) * 100, rounded to 2 decimal places. For any production order where target_qty = 0, efficiency_percent SHALL equal 0.

**Validates: Requirements 3.2, 3.3**

### Property 4: Seeder Idempotence

*For any* database state, running the seeder script multiple times SHALL produce the same final database state (same number of machines and production orders with identical values).

**Validates: Requirements 4.6**

### Property 5: Theme Selection Based on Time

*For any* time of day, the theme switcher SHALL select dark theme when the hour is >= 18 or < 6, and SHALL select light theme when the hour is >= 6 and < 18.

**Validates: Requirements 5.3, 5.4**

## Error Handling

### Backend Error Handling

**Validation Errors (400 Bad Request)**:
- Missing required fields in request body
- Invalid data types (e.g., string for integer field)
- Negative values for quantity fields
- Non-existent machine_id reference
- Invalid date formats

**Response Format**:
```json
{
  "error": "Validation failed",
  "details": {
    "field_name": "Error description"
  }
}
```

**Resource Not Found (404 Not Found)**:
- Requesting non-existent production order by ID
- Response: `{"error": "Production order not found"}`

**Database Errors (500 Internal Server Error)**:
- Connection failures
- Constraint violations
- Transaction rollback on error
- Response: `{"error": "Internal server error"}` (no sensitive details exposed)

**CORS Errors**:
- Handled by Flask-CORS middleware
- Proper headers for cross-origin requests during development

### Frontend Error Handling

**Network Errors**:
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- Display user-friendly message: "Unable to connect to server. Retrying..."
- After 3 failures: "Connection failed. Please check your network."

**HTTP Errors**:
- Parse error message from response body
- Display in modal or toast notification
- Example: "Failed to create production order: Target quantity must be positive"

**Validation Errors**:
- Client-side validation before submission
- Real-time feedback on form fields
- Prevent submission until valid

**Loading States**:
- Display spinner or skeleton UI during data fetch
- Disable form buttons during submission
- Prevent duplicate submissions

**Timeout Handling**:
- 10-second timeout for all API requests
- Treat timeout as network error (retry logic applies)

## Testing Strategy

### Unit Tests

**Backend Unit Tests** (pytest):

1. **Model Tests**:
   - Test model creation with valid data
   - Test model validation (e.g., negative quantities rejected)
   - Test relationship loading (machine.production_orders)
   - Test to_dict() serialization for specific examples

2. **Calculation Tests**:
   - Test pending_qty calculation with specific examples
   - Test efficiency_percent calculation with specific examples
   - Test edge case: efficiency with zero target_qty
   - Test edge case: efficiency with completed > target (over 100%)

3. **Validation Tests**:
   - Test ValidationService with invalid data examples
   - Test missing required fields
   - Test invalid foreign key references

4. **API Route Tests** (integration-style unit tests with test database):
   - Test GET /api/machines returns active machines only
   - Test GET /api/production-orders includes calculated fields
   - Test POST /api/production-orders creates new record
   - Test PUT /api/production-orders updates existing record
   - Test 404 response for non-existent resources
   - Test 400 response for invalid data

**Frontend Unit Tests** (Jest or similar):

1. **API Client Tests**:
   - Test fetch methods with mocked responses
   - Test error handling with mocked failures
   - Test retry logic with mocked network errors

2. **Theme Switcher Tests**:
   - Test theme selection for specific times (e.g., 8 AM, 8 PM)
   - Test theme application to DOM

3. **Chart Component Tests**:
   - Test chart initialization with sample data
   - Test chart update with new data
   - Test color coding logic

4. **Form Validation Tests**:
   - Test client-side validation rules
   - Test validation error display

### Property-Based Tests

**Backend Property Tests** (pytest with Hypothesis library):

The system SHALL use the Hypothesis library for property-based testing in Python. Each property test SHALL run a minimum of 100 iterations with randomly generated inputs.

1. **Property 1: ORM Serialization Round-Trip**
   - **Tag**: `# Feature: shop-floor-dashboard, Property 1: For any valid Machine or ProductionOrder model instance, serializing to JSON via to_dict() and then reconstructing from that dictionary SHALL produce an object with equivalent field values`
   - **Generator**: Random Machine and ProductionOrder instances with varied field values
   - **Test**: Serialize → Deserialize → Assert all fields equal

2. **Property 2: Pending Quantity Calculation**
   - **Tag**: `# Feature: shop-floor-dashboard, Property 2: For any production order with target_qty, completed_qty, and wip_qty values, the calculated pending_qty SHALL equal (target_qty - completed_qty - wip_qty)`
   - **Generator**: Random non-negative integers for target_qty, completed_qty, wip_qty (with constraint: completed_qty + wip_qty <= target_qty)
   - **Test**: Calculate pending_qty → Assert equals (target - completed - wip)

3. **Property 3: Efficiency Percentage Calculation**
   - **Tag**: `# Feature: shop-floor-dashboard, Property 3: For any production order where target_qty > 0, the calculated efficiency_percent SHALL equal (completed_qty / target_qty) * 100, rounded to 2 decimal places`
   - **Generator**: Random non-negative integers for target_qty (including 0) and completed_qty
   - **Test**: Calculate efficiency_percent → Assert correct value based on target_qty

4. **Property 4: Seeder Idempotence**
   - **Tag**: `# Feature: shop-floor-dashboard, Property 4: For any database state, running the seeder script multiple times SHALL produce the same final database state`
   - **Generator**: Random initial database states (empty or with existing data)
   - **Test**: Run seeder → Capture state → Run seeder again → Assert states identical

**Frontend Property Tests** (fast-check library for JavaScript):

The system SHALL use the fast-check library for property-based testing in JavaScript. Each property test SHALL run a minimum of 100 iterations.

5. **Property 5: Theme Selection Based on Time**
   - **Tag**: `// Feature: shop-floor-dashboard, Property 5: For any time of day, the theme switcher SHALL select dark theme when the hour is >= 18 or < 6, and SHALL select light theme when the hour is >= 6 and < 18`
   - **Generator**: Random hour values (0-23)
   - **Test**: Call theme selection logic → Assert correct theme for hour

### Integration Tests

1. **End-to-End API Tests**:
   - Test complete request/response cycle with real database
   - Test CORS headers in responses
   - Test health check endpoint

2. **Database Integration Tests**:
   - Test foreign key constraints
   - Test cascade deletes
   - Test index performance with large datasets

3. **Frontend Integration Tests**:
   - Test TV Mode auto-refresh cycle
   - Test Supervisor Mode form submission flow
   - Test chart rendering with real API data
   - Test error handling with failed API calls

### Test Coverage Goals

- **Backend**: 90%+ code coverage for business logic and services
- **Frontend**: 80%+ coverage for JavaScript modules
- **Property Tests**: All 5 correctness properties implemented
- **Integration Tests**: All critical user flows covered

### Testing Tools

- **Backend**: pytest, pytest-cov, Hypothesis, Flask test client
- **Frontend**: Jest (or Vitest), fast-check, jsdom
- **Database**: pytest-postgresql for test database fixtures
- **API Testing**: requests library or httpx

## Implementation Notes

### Development Workflow

1. **Database Setup**:
   - Create PostgreSQL database
   - Run migrations (or create tables via SQLAlchemy)
   - Run seeder script for initial data

2. **Backend Development**:
   - Implement models and migrations
   - Implement business logic services
   - Implement API routes
   - Write unit and property tests
   - Run tests: `pytest --cov`

3. **Frontend Development**:
   - Create HTML templates for TV and Supervisor modes
   - Implement JavaScript modules
   - Integrate Chart.js
   - Apply Tailwind CSS styling
   - Write unit and property tests
   - Run tests: `npm test`

4. **Integration Testing**:
   - Start backend server
   - Test both modes in browser
   - Verify auto-refresh in TV Mode
   - Verify form submissions in Supervisor Mode
   - Test responsive layouts

### Deployment Considerations

**Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `FLASK_ENV`: development or production
- `CORS_ORIGINS`: Allowed origins for CORS (restrict in production)
- `SECRET_KEY`: Flask secret key for sessions

**Production Optimizations**:
- Use production WSGI server (Gunicorn or uWSGI)
- Enable PostgreSQL connection pooling
- Minify JavaScript and CSS
- Enable gzip compression
- Set appropriate cache headers for static assets
- Use CDN for Chart.js and Tailwind CSS

**Security Considerations**:
- Validate all user inputs server-side
- Use parameterized queries (SQLAlchemy handles this)
- Restrict CORS origins in production
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Sanitize error messages (no sensitive data exposure)

### Performance Considerations

**Backend**:
- Database indexes on foreign keys and date fields
- Limit query results (pagination for large datasets)
- Cache machine list (rarely changes)
- Use database connection pooling

**Frontend**:
- Debounce form inputs
- Lazy load Chart.js only in Supervisor Mode
- Use CSS animations for smooth transitions
- Minimize DOM manipulations during updates
- Consider virtual scrolling for large production order lists

### Browser Compatibility

- Target: Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features: Use Babel if older browser support needed
- Fetch API: Native support in all modern browsers
- CSS Grid and Flexbox: Supported in all modern browsers
- Tailwind CSS: Works in all modern browsers

### Accessibility Considerations

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support in Supervisor Mode
- Sufficient color contrast (WCAG AA compliance)
- Focus indicators for form fields
- Screen reader friendly error messages

### Future Enhancements (Out of Scope for MVP)

- WebSocket support for true real-time updates
- User authentication and authorization
- Historical data tracking and trend analysis
- Export functionality (CSV, PDF reports)
- Mobile app version
- Push notifications for critical alerts
- Multi-language support
- Advanced filtering and search
- Customizable dashboard layouts
