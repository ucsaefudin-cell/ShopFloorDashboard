# Implementation Plan: Shop Floor Dashboard MVP

## Overview

This implementation plan breaks down the Shop Floor Dashboard into incremental, testable tasks. The approach follows a backend-first strategy, establishing the data layer and API before building the frontend interfaces. Each task is designed to be independently reviewable and builds upon previous work.

The implementation uses Python/Flask for the backend API, PostgreSQL for data persistence, and vanilla JavaScript for the frontend. Testing includes both example-based unit tests and property-based tests for universal correctness guarantees.

## Tasks

- [x] 1. Set up backend scaffolding, database models, and seeder script
  - Create Flask application structure with proper configuration
  - Define SQLAlchemy ORM models for Machine and ProductionOrder
  - Implement database schema with foreign keys and constraints
  - Create seeder script to populate database with realistic dummy data
  - Set up database connection and initialization
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1, 9.2, 9.3_

- [ ]* 1.1 Write property test for ORM serialization round-trip
  - **Property 1: ORM Serialization Round-Trip**
  - **Validates: Requirements 1.5**
  - Use Hypothesis to generate random Machine and ProductionOrder instances
  - Test that serializing via to_dict() and reconstructing produces equivalent objects

- [x] 2. Implement business logic services and calculations
  - [x] 2.1 Create CalculationService with pending_qty and efficiency_percent methods
    - Implement calculate_pending_qty(target_qty, completed_qty, wip_qty)
    - Implement calculate_efficiency_percent(completed_qty, target_qty)
    - Handle edge case: efficiency when target_qty is zero
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.2 Write property test for pending quantity calculation
    - **Property 2: Pending Quantity Calculation**
    - **Validates: Requirements 3.1**
    - Use Hypothesis to generate random non-negative integers for quantities
    - Test that pending_qty always equals (target_qty - completed_qty - wip_qty)

  - [ ]* 2.3 Write property test for efficiency percentage calculation
    - **Property 3: Efficiency Percentage Calculation**
    - **Validates: Requirements 3.2, 3.3**
    - Use Hypothesis to generate random target_qty (including 0) and completed_qty
    - Test correct efficiency calculation and zero-target edge case

  - [x] 2.4 Create ValidationService for production order data validation
    - Validate required fields presence
    - Validate non-negative quantities
    - Validate foreign key references (machine_id exists)
    - Validate date formats
    - _Requirements: 2.6_

  - [ ]* 2.5 Write unit tests for ValidationService
    - Test validation with invalid data examples
    - Test missing required fields
    - Test invalid foreign key references
    - _Requirements: 2.6_

- [x] 3. Implement REST API endpoints
  - [x] 3.1 Create machine endpoints
    - Implement GET /api/machines to list all active machines
    - Implement serialization to JSON
    - _Requirements: 2.1_

  - [x] 3.2 Create production order read endpoints
    - Implement GET /api/production-orders to list all orders with calculations
    - Implement GET /api/production-orders/{id} for single order retrieval
    - Include pending_qty and efficiency_percent in responses
    - _Requirements: 2.2, 2.3, 3.4_

  - [x] 3.3 Create production order write endpoints
    - Implement POST /api/production-orders to create new orders
    - Implement PUT /api/production-orders/{id} to update existing orders
    - Integrate ValidationService for input validation
    - Return appropriate status codes (201, 400, 404)
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [x] 3.4 Implement health check endpoint
    - Create GET /api/health endpoint returning {status: "ok"}
    - _Requirements: 9.6_

  - [ ]* 3.5 Write integration tests for API endpoints
    - Test GET /api/machines returns active machines only
    - Test GET /api/production-orders includes calculated fields
    - Test POST creates new record with 201 status
    - Test PUT updates existing record
    - Test 404 response for non-existent resources
    - Test 400 response for invalid data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Configure Flask application and CORS
  - Set up environment variable configuration
  - Configure CORS for frontend requests
  - Set up static file serving
  - Configure database connection pooling
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ]* 4.1 Write property test for seeder idempotence
  - **Property 4: Seeder Idempotence**
  - **Validates: Requirements 4.6**
  - Use Hypothesis to generate random initial database states
  - Test that running seeder multiple times produces identical final state

- [x] 5. Checkpoint - Backend validation
  - Ensure all backend tests pass
  - Verify seeder script populates database correctly
  - Test all API endpoints manually using curl or Postman
  - Ask the user if questions arise or if ready to proceed to frontend

- [x] 6. Create frontend scaffolding and API client
  - [x] 6.1 Set up HTML templates for TV Mode and Supervisor Mode
    - Create base HTML structure with Tailwind CSS CDN
    - Apply Sonoco branding colors (dark blue + lime green)
    - Set up routing structure for /tv and /supervisor paths
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.2 Implement API client module (api.js)
    - Create fetchMachines() method
    - Create fetchProductionOrders() method
    - Create fetchProductionOrder(id) method
    - Create createProductionOrder(data) method
    - Create updateProductionOrder(id, data) method
    - Implement error handling with retry logic (3 attempts, exponential backoff)
    - Implement 10-second request timeout
    - _Requirements: 8.1, 8.4, 8.6_

  - [ ]* 6.3 Write unit tests for API client
    - Test fetch methods with mocked responses
    - Test error handling with mocked failures
    - Test retry logic with mocked network errors
    - _Requirements: 8.4_

- [x] 7. Implement theme switcher component
  - [x] 7.1 Create theme.js module with time-based theme selection
    - Implement applyTheme() function that detects current hour
    - Apply dark theme for hours >= 18 or < 6
    - Apply light theme for hours >= 6 and < 18
    - Toggle Tailwind CSS dark mode classes on root element
    - _Requirements: 5.3, 5.4_

  - [ ]* 7.2 Write property test for theme selection
    - **Property 5: Theme Selection Based on Time**
    - **Validates: Requirements 5.3, 5.4**
    - Use fast-check to generate random hour values (0-23)
    - Test correct theme selection for all hours

- [x] 8. Implement TV Mode component
  - [x] 8.1 Create tv-mode.js with auto-refresh functionality
    - Implement mode detection from URL path
    - Render large-format production metrics grid
    - Implement 30-second auto-refresh using setInterval
    - Apply theme switcher on load and refresh
    - Display machine_name, shift_name, quantities, and efficiency
    - Use color-coded efficiency indicators (green >90%, yellow 70-90%, red <70%)
    - Ensure zero-touch operation (no user interaction required)
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

  - [x] 8.2 Implement shift handover event detection and display
    - Detect current time and determine active shift
    - Trigger handover event 15 minutes before shift end (1:45 PM, 9:45 PM, 5:45 AM)
    - Hide normal dashboard during handover window
    - Display full-screen motivational overlay with shift summary
    - Show gratitude to outgoing shift and welcome to incoming shift
    - Return to normal dashboard after shift transition
    - _Requirements: 5.1, 5.2_

  - [ ]* 8.3 Write unit tests for TV Mode
    - Test auto-refresh cycle
    - Test shift handover detection logic
    - Test rendering with sample data
    - _Requirements: 5.2_

- [x] 9. Implement Supervisor Mode component
  - [x] 9.1 Create supervisor-mode.js with interactive table
    - Render production order table with all fields
    - Implement row click to expand details
    - Implement manual refresh button
    - Display loading states during data fetch
    - _Requirements: 6.1, 6.2, 8.2, 8.3, 8.5_

  - [x] 9.2 Implement form handling for create and update operations
    - Create modal form for new production orders
    - Implement inline editing for completed_qty and wip_qty
    - Add client-side validation with real-time feedback
    - Handle form submission with API client
    - Display success/error messages after submission
    - Update display without full page reload
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 8.1, 8.2, 8.3_

  - [ ]* 9.3 Write unit tests for Supervisor Mode
    - Test form validation logic
    - Test form submission flow with mocked API
    - Test error message display
    - _Requirements: 6.6, 6.7_

- [x] 10. Implement Chart.js visualizations
  - [x] 10.1 Create charts.js module with pacing and efficiency charts
    - Initialize Chart.js instances
    - Implement pacing line chart (completed_qty over time)
    - Implement efficiency bar chart (comparison across orders)
    - Apply color coding (green >90%, yellow 70-90%, red <70%)
    - Add chart legends and axis labels
    - Implement chart update logic when data changes
    - Implement smooth animations for transitions
    - _Requirements: 6.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 10.2 Write unit tests for chart component
    - Test chart initialization with sample data
    - Test chart update with new data
    - Test color coding logic
    - _Requirements: 10.5_

- [x] 11. Implement responsive layout with Tailwind CSS
  - Apply mobile-first responsive design
  - Configure breakpoints for mobile (<768px), tablet (768-1024px), desktop (>1024px)
  - Ensure readability and usability across all viewport sizes
  - Test layout on different screen sizes
  - _Requirements: 7.1, 7.4, 7.5, 7.6, 7.7_

- [x] 12. Final checkpoint - End-to-end validation
  - Ensure all tests pass (backend and frontend)
  - Test TV Mode in browser with auto-refresh
  - Test Supervisor Mode form submissions
  - Test responsive layouts on different devices
  - Verify shift handover event triggers correctly
  - Test theme switching at different times
  - Ask the user if questions arise or if ready for deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Backend tasks (1-5) should be completed before frontend tasks (6-12)
- Checkpoints (tasks 5 and 12) ensure incremental validation and user review
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The user requested Task 1 to include backend scaffolding, models, and seeder - this is reflected in the structure
