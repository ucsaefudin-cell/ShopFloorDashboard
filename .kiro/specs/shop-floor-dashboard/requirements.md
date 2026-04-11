# Requirements Document

## Introduction

The Shop Floor Dashboard is a real-time production monitoring system for manufacturing environments. This MVP (Phase 1) provides two operating modes: a zero-touch TV Mode for passive monitoring from distance, and an interactive Supervisor Mode for data management and analysis. The system displays live production metrics including machine status, order progress, efficiency calculations, and pacing charts.

## Glossary

- **Dashboard**: The web-based production monitoring system
- **TV_Mode**: A zero-touch display mode optimized for visibility from distance with auto-refresh
- **Supervisor_Mode**: An interactive mode with data entry and management capabilities
- **Backend_API**: The Flask-based REST API serving production data
- **Frontend**: The vanilla JavaScript client that fetches and renders data
- **Database**: The PostgreSQL database storing machine and production order data
- **Machine**: A production unit tracked in the mst_machine table
- **Production_Order**: A work order tracked in the trx_production_order table
- **Pending_Qty**: Calculated value: target_qty - completed_qty - wip_qty
- **Efficiency_Percent**: Calculated value: (completed_qty / target_qty) * 100
- **Seeder_Script**: A utility script that populates the database with realistic dummy data
- **Theme_Switcher**: A component that automatically changes UI theme based on time of day

## Requirements

### Requirement 1: Database Schema and Models

**User Story:** As a developer, I want to define the database schema and ORM models, so that the system can persist and query production data.

#### Acceptance Criteria

1. THE Database SHALL contain a table named mst_machine with columns: id, machine_code, machine_name, is_active
2. THE Database SHALL contain a table named trx_production_order with columns: id, machine_id, shift_name, order_date, target_qty, completed_qty, wip_qty, created_at
3. THE Backend_API SHALL define SQLAlchemy ORM models corresponding to both tables
4. THE Backend_API SHALL establish a foreign key relationship from trx_production_order.machine_id to mst_machine.id
5. FOR ALL valid ORM model instances, serializing to JSON then deserializing SHALL produce equivalent objects (round-trip property)

### Requirement 2: Backend API Endpoints

**User Story:** As a frontend developer, I want REST API endpoints, so that I can fetch production data for display.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/machines, THE Backend_API SHALL return a JSON array of all active machines
2. WHEN a GET request is made to /api/production-orders, THE Backend_API SHALL return a JSON array of all production orders with calculated pending_qty and efficiency_percent fields
3. WHEN a GET request is made to /api/production-orders/{id}, THE Backend_API SHALL return a JSON object for the specified production order
4. WHEN a POST request with valid data is made to /api/production-orders, THE Backend_API SHALL create a new production order and return the created object
5. WHEN a PUT request with valid data is made to /api/production-orders/{id}, THE Backend_API SHALL update the specified production order and return the updated object
6. IF invalid data is provided to any endpoint, THEN THE Backend_API SHALL return a 400 status code with a descriptive error message
7. IF a non-existent resource is requested, THEN THE Backend_API SHALL return a 404 status code

### Requirement 3: Business Logic Calculations

**User Story:** As a production manager, I want accurate real-time calculations, so that I can monitor production efficiency.

#### Acceptance Criteria

1. FOR ALL production orders, THE Backend_API SHALL calculate pending_qty as (target_qty - completed_qty - wip_qty)
2. FOR ALL production orders WHERE target_qty is greater than zero, THE Backend_API SHALL calculate efficiency_percent as (completed_qty / target_qty) * 100
3. FOR ALL production orders WHERE target_qty is zero, THE Backend_API SHALL return efficiency_percent as 0
4. THE Backend_API SHALL include pending_qty and efficiency_percent in all production order API responses
5. FOR ALL production orders, pending_qty plus completed_qty plus wip_qty SHALL equal target_qty (invariant property)

### Requirement 4: Database Seeder Script

**User Story:** As a developer, I want a seeder script with realistic dummy data, so that I can demonstrate and test the dashboard.

#### Acceptance Criteria

1. THE Seeder_Script SHALL create at least 5 machine records with varied machine_codes and machine_names
2. THE Seeder_Script SHALL create at least 20 production order records across multiple machines and shifts
3. THE Seeder_Script SHALL generate production orders with realistic values for target_qty, completed_qty, and wip_qty
4. THE Seeder_Script SHALL include production orders with varying efficiency levels (below target, on target, above target)
5. WHEN the Seeder_Script is executed, THE Database SHALL be populated with the dummy data
6. THE Seeder_Script SHALL clear existing data before seeding to ensure idempotent execution

### Requirement 5: TV Mode Display

**User Story:** As a shop floor worker, I want a zero-touch TV display, so that I can monitor production status from a distance.

#### Acceptance Criteria

1. WHEN TV_Mode is accessed, THE Frontend SHALL display production metrics with large typography optimized for distance viewing
2. WHILE TV_Mode is active, THE Frontend SHALL automatically refresh data every 30 seconds without full page reload
3. WHILE TV_Mode is active, THE Theme_Switcher SHALL automatically switch to dark theme during night hours (6 PM - 6 AM)
4. WHILE TV_Mode is active, THE Theme_Switcher SHALL automatically switch to light theme during day hours (6 AM - 6 PM)
5. THE Frontend SHALL display machine_name, shift_name, target_qty, completed_qty, wip_qty, pending_qty, and efficiency_percent for each production order
6. THE Frontend SHALL use dark blue primary background and lime green highlights matching Sonoco branding
7. THE Frontend SHALL require no user interaction for continuous operation

### Requirement 6: Supervisor Mode Display

**User Story:** As a production supervisor, I want an interactive dashboard, so that I can manage production data and analyze trends.

#### Acceptance Criteria

1. WHEN Supervisor_Mode is accessed, THE Frontend SHALL display production metrics with interactive controls
2. WHEN a supervisor clicks on a production order, THE Frontend SHALL display detailed information and editing options
3. THE Frontend SHALL display pacing charts using Chart.js showing production progress over time
4. THE Frontend SHALL provide forms for creating new production orders
5. THE Frontend SHALL provide forms for updating existing production orders
6. WHEN a supervisor submits a form, THE Frontend SHALL send data to the Backend_API and update the display without full page reload
7. IF form submission fails, THEN THE Frontend SHALL display a descriptive error message to the supervisor

### Requirement 7: Responsive UI with Branding

**User Story:** As a stakeholder, I want a branded responsive interface, so that the dashboard is usable on various devices and represents our company.

#### Acceptance Criteria

1. THE Frontend SHALL use Tailwind CSS for responsive styling
2. THE Frontend SHALL use dark blue as the primary background color
3. THE Frontend SHALL use lime green or green gradient for highlights and accents
4. WHEN the viewport width is less than 768px, THE Frontend SHALL adjust layout for mobile viewing
5. WHEN the viewport width is between 768px and 1024px, THE Frontend SHALL adjust layout for tablet viewing
6. WHEN the viewport width is greater than 1024px, THE Frontend SHALL display the full desktop layout
7. THE Frontend SHALL maintain readability and usability across all viewport sizes

### Requirement 8: Real-Time Data Updates

**User Story:** As a user, I want real-time data updates, so that I always see current production status without manual refresh.

#### Acceptance Criteria

1. THE Frontend SHALL fetch production data from the Backend_API using vanilla JavaScript fetch API
2. THE Frontend SHALL update displayed metrics without triggering a full page reload
3. WHEN new data is received, THE Frontend SHALL smoothly update the DOM elements with new values
4. THE Frontend SHALL handle network errors gracefully and retry failed requests
5. WHILE data is being fetched, THE Frontend SHALL indicate loading state to the user
6. FOR ALL data updates, the displayed values SHALL match the values returned by the Backend_API (consistency property)

### Requirement 9: Flask Application Configuration

**User Story:** As a developer, I want proper Flask application configuration, so that the system can run in different environments.

#### Acceptance Criteria

1. THE Backend_API SHALL support configuration via environment variables
2. THE Backend_API SHALL provide default configuration values for development environment
3. THE Backend_API SHALL configure database connection using SQLAlchemy connection string
4. THE Backend_API SHALL enable CORS for frontend requests during development
5. THE Backend_API SHALL serve static files for the Frontend from a designated directory
6. THE Backend_API SHALL provide a health check endpoint at /api/health that returns 200 status

### Requirement 10: Chart Visualization

**User Story:** As a supervisor, I want visual charts of production pacing, so that I can quickly identify trends and issues.

#### Acceptance Criteria

1. WHERE Supervisor_Mode is active, THE Frontend SHALL display pacing charts using Chart.js library
2. THE Frontend SHALL display a line chart showing completed_qty progression over time for each production order
3. THE Frontend SHALL display a bar chart comparing efficiency_percent across all active production orders
4. WHEN chart data is updated, THE Frontend SHALL animate the transition smoothly
5. THE Frontend SHALL use color coding (green for on-target, yellow for below-target, red for critical) in charts
6. THE Frontend SHALL display chart legends and axis labels for clarity
