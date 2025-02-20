---

# Task List: Academic Resource Discovery Application

## Project Overview

**Goal:** Build a web application to discover academic resources using a simple search interface.

**Technology Stack:**

- **Frontend Framework:** Next.js 15
- **UI Library:** React 19 with Material UI (MUI) v6
- **Styling:** Custom MUI Theme (based on Figma mockups)
- **Authentication & User State:** Firebase (Basic SSO)
- **Backend Data:** Harmony Discovery API
- **Database (optional, for user data):** Firebase Database (already configured)

**API Endpoints:**

- **Aggregate Filters:** `https://harmonydiscoveryapi.fastdatascience.com/docs#/Discovery/aggregate_discover_aggregate_get`
- **Search:** `https://harmonydiscoveryapi.fastdatascience.com/docs#/Discovery/discover_search`

## Task Breakdown

This task list is broken down into modules. Each module contains a series of tasks to guide you through the development process.

**Module 1: Project Setup & Initial Configuration (Estimated Time: 1-2 days)**

1.  **Task 1.1: Create a New Next.js Project**

    - [x] **Description:** Use the Next.js CLI to create a new project. Ensure you are using Next.js 15 and React 19 as specified.
    - [x] **Steps:**
      - [x] Use the command: `npx create-next-app@latest academic-discovery-app --typescript --eslint`
      - [x] Follow the prompts and select TypeScript, ESLint, and other recommended options.
      - [x] Navigate into the project directory
    - [x] **Estimated Time:** Small (1 hour)
    - [x] **Dependencies:** Node.js and npm/yarn/pnpm installed
    - [x] **Notes:** If you encounter issues, refer to the Next.js documentation

2.  **Task 1.2: Install Dependencies: MUI and Firebase**

    - [x] **Description:** Install MUI v6 and Firebase JavaScript SDK.
    - [x] **Steps:**
      - [x] Install MUI and its dependencies
      - [x] Install Firebase
      - [x] Install additional required packages (react-toastify, framer-motion, lucide-react)
    - [x] **Estimated Time:** Small (30 minutes)
    - [x] **Dependencies:** Task 1.1
    - [x] **Notes:** Using `@mui/material` which includes core MUI components

3.  **Task 1.3: Set up Firebase Configuration**

    - [x] **Description:** Configure Firebase in the application
    - [x] **Steps:**
      - [x] Verify Config File: Firebase config file is present
      - [x] Initialize Firebase in the application
    - [x] **Estimated Time:** Medium (2-3 hours)
    - [x] **Dependencies:** Task 1.2, Firebase config file
    - [x] **Notes:** Firebase config is correctly set up

4.  **Task 1.4: Create Basic Layout Component**

    - [x] **Description:** Create a basic layout component to structure the header and main content area
    - [x] **Steps:**
      - [x] Create components folder in src directory
      - [x] Create layout component with sidebar navigation
      - [x] Implement basic layout structure using MUI components
      - [x] Create theme configuration based on Figma designs
    - [x] **Estimated Time:** Small (1-2 hours)
    - [x] **Dependencies:** Task 1.2
    - [x] **Notes:** Basic layout implemented with responsive design

**Module 2: Implement Filter Chips (Estimated Time: 2-3 days)**

1.  **Task 2.1: Fetch Aggregate Data from API**

    - [ ] **Description:** Create a function to fetch data from the aggregate API endpoint.
    - [ ] **Steps:**
      - [ ] Create services folder for API functions
      - [ ] Implement fetchAggregateFilters function
    - [ ] **Estimated Time:** Medium (2 hours)
    - [ ] **Dependencies:** Basic understanding of fetch API and asynchronous JavaScript
    - [ ] **Notes:** Handle potential errors gracefully

2.  **Task 2.2: Display Filter Chips**

    - [x] **Description:** Create a component to display filter chips
    - [x] **Steps:**
      - [x] Create FilterChips component
      - [x] Use MUI Chip component for filters
      - [x] Style according to Figma design
    - [x] **Estimated Time:** Medium (2-3 hours)
    - [x] **Dependencies:** Task 2.1, MUI components
    - [x] **Notes:** Filter chips UI implemented

3.  **Task 2.3: Implement Filter Chip Selection and State Management**

    - [ ] **Description:** Make the filter chips interactive and manage state
    - [ ] **Steps:**
      - [ ] Add onClick handlers
      - [ ] Implement state management
      - [ ] Add visual feedback for selected state
    - [ ] **Estimated Time:** Medium (3-4 hours)
    - [ ] **Dependencies:** Task 2.2
    - [ ] **Notes:** State management pending

**Module 3: Implement Search Bar and Results Display (Estimated Time: 2-3 days)**

1.  **Task 3.1: Create Search Bar Component**

    - [x] **Description:** Create search bar component with input field and search button
    - [x] **Steps:**
      - [x] Create SearchBar component
      - [x] Implement search input and button
      - [x] Add search functionality
    - [x] **Estimated Time:** Medium (2-3 hours)
    - [x] **Dependencies:** MUI components
    - [x] **Notes:** Search bar UI implemented

2.  **Task 3.2: Fetch Search Results from API**

    - [ ] **Description:** Create function to fetch search results
    - [ ] **Steps:**
      - [ ] Implement fetchSearchResults function
      - [ ] Add API integration
    - [ ] **Estimated Time:** Medium (2 hours)
    - [ ] **Dependencies:** Task 3.1
    - [ ] **Notes:** API integration pending

3.  **Task 3.3: Display Search Results**

    - [x] **Description:** Create SearchResults component
    - [x] **Steps:**
      - [x] Create component structure
      - [x] Implement result cards
      - [x] Style according to Figma design
    - [x] **Estimated Time:** Medium (3-4 hours)
    - [x] **Dependencies:** Task 3.2
    - [x] **Notes:** Search results UI implemented with sample data

**Module 4: Firebase Authentication (Estimated Time: 1-2 days)**

1.  **Task 4.1: Implement Firebase Basic SSO Authentication**

    - [ ] **Description:** Integrate Firebase basic Single Sign-On (SSO) authentication into your application.
    - [ ] **Steps:**
      - [ ] **Enable SSO Provider in Firebase Console:** Enable desired SSO provider in Firebase project console.
      - [ ] **Create Login/Logout UI Elements (if needed):** Add login/logout buttons or links.
      - [ ] **Implement Sign-in Function:** Create a function to initiate the SSO sign-in flow using Firebase Authentication's redirect methods (e.g., `signInWithRedirect`) using provided code snippet.
      - [ ] **Implement Login Button:** Add a button to your `Layout` component that calls `signInWithGoogle` on click.
    - [ ] **Estimated Time:** Medium (3-4 hours, especially if setting up SSO for the first time)
    - [ ] **Dependencies:** Task 1.3, Firebase Authentication enabled, understanding of Firebase Authentication methods.
    - [ ] **Notes:** Test the SSO login flow and confirm user authentication in Firebase Console.

2.  **Task 4.2: Implement User State Management**

    - [ ] **Description:** Manage user authentication state using Firebase Authentication's `onAuthStateChanged`.
    - [ ] **Steps:**
      - [ ] **Create Auth Context (Optional):** Consider setting up React Context for authentication state management.
      - [ ] **Listen for Authentication State Changes:** In `pages/_app.js`, use `useEffect` and `onAuthStateChanged` to listen for changes in user authentication state and store the current user in component state using provided code snippet.
      - [ ] **Access User State:** Access the `user` prop in your pages and components to check user login status.
    - [ ] **Estimated Time:** Medium (2-3 hours)
    - [ ] **Dependencies:** Task 4.1, Firebase Authentication, React `useEffect`, state management in `_app.js`.
    - [ ] **Notes:** Test user state management and ensure the application correctly reflects user login status after login/logout.

**Module 5: Theming and Styling (Estimated Time: 2-3 days)**

1.  **Task 5.1: Set up Custom MUI Theme**

    - [ ] **Description:** Create a custom MUI theme based on the Figma mockups.
    - [ ] **Steps:**
      - [ ] Create a `theme` folder in `src` (e.g., `src/theme`).
      - [ ] Create a file `src/theme/theme.js` (or `.tsx`).
      - [ ] Use `createTheme` from `@mui/material/styles` to define your custom theme, customizing `palette`, `typography`, and `components` based on Figma mockups using provided code snippet as a starting point.
      - [ ] **Apply the Theme:** In `pages/_app.js`, use `ThemeProvider` to wrap your application and apply the custom theme.
    - [ ] **Estimated Time:** Medium (3-4 hours)
    - [ ] **Dependencies:** Task 1.2, Figma mockups, understanding of MUI theming system.
    - [ ] **Notes:** Examine Figma mockups and translate design specifications into your custom MUI theme.

2.  **Task 5.2: Apply Theme to Components and Refine Styling**

    - [ ] **Description:** Ensure all components are using the custom theme and refine styling to match Figma mockups.
    - [ ] **Steps:**
      - [ ] Review all components and ensure they are styled consistently with the custom theme.
      - [ ] Use MUI component props and the `sx` prop for styling.
      - [ ] Explore using `styled-components` or custom CSS if needed (use sparingly).
      - [ ] Ensure responsiveness across different screen sizes.
    - [ ] **Estimated Time:** Medium (2-4 days)
    - [ ] **Dependencies:** Task 5.1, Figma mockups, understanding of MUI styling approaches.
    - [ ] **Notes:** Pay close attention to detail and test on different browsers and screen sizes.

**Module 6: Testing and Documentation (Estimated Time: 1-2 days)**

1.  **Task 6.1: Basic Component Testing**

    - [ ] **Description:** Write basic unit tests for key components.
    - [ ] **Steps:**
      - [ ] Install testing dependencies: `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
      - [ ] Create test files in a `__tests__` folder next to components.
      - [ ] Write tests using React Testing Library to render components and assert on their behavior using provided example test for `SearchBar`.
      - [ ] Run tests using `npm test`.
    - [ ] **Estimated Time:** Medium (2-3 days)
    - [ ] **Dependencies:** Task 1.2, Understanding of unit testing concepts, Jest and React Testing Library.
    - [ ] **Notes:** Focus on testing core logic and functionality of components.

2.  **Task 6.2: Basic Integration Testing (Optional)**

    - [ ] **Description:** Add basic integration tests to verify component and API interaction (Optional).
    - [ ] **Steps:**
      - [ ] Use mocking libraries to simulate API responses in tests.
      - [ ] Write tests that verify API calls and component rendering based on mocked API responses.
    - [ ] **Estimated Time:** Optional, Medium (2-3 days)
    - [ ] **Dependencies:** Task 6.1, Understanding of integration testing, API mocking techniques.

3.  **Task 6.3: Basic Documentation**

    - [ ] **Description:** Create basic documentation for your application in a `README.md` file.
    - [ ] **Steps:**
      - [ ] Create a `README.md` file in the project root.
      - [ ] Document project setup, component descriptions, API endpoints, Firebase setup, and deployment instructions.
    - [ ] **Estimated Time:** Small (1-2 days)
    - [ ] **Dependencies:** Completion of most development tasks.
    - [ ] **Notes:** Document essential information to get started with the project.

**Module 7: Basic Deployment (Estimated Time: 1 day)**

1.  **Task 7.1: Deploy to Vercel or Netlify (Recommended for Next.js)**
    - [ ] **Description:** Deploy your Next.js application to a hosting platform like Vercel or Netlify.
    - [ ] **Steps:**
      - [ ] **Choose a Hosting Platform:** Select Vercel or Netlify.
      - [ ] **Create an Account:** Sign up for an account.
      - [ ] **Connect to Git Repository:** Connect your project's Git repository.
      - [ ] **Configure Deployment Settings:** Configure environment variables and build settings if needed.
      - [ ] **Deploy:** Trigger deployment.
      - [ ] **Test Deployed Application:** Test the deployed application to ensure it's working correctly.
    - [ ] **Estimated Time:** Small (1 day, mainly for initial setup)
    - [ ] **Dependencies:** Completion of development tasks, Git repository, account on Vercel or Netlify.
    - [ ] **Notes:** Vercel is recommended for Next.js, but Netlify is also a good option.

---
