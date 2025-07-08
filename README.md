# Collaborative Drawing Board - Frontend

This is a React-based frontend for a real-time collaborative drawing board. It uses **p5.js** for rendering and **WebSockets** for live communication with the backend.

Multiple users can draw on a shared canvas simultaneously. All drawing actions are synchronized in real time.

## Features

-  Free drawing with adjustable brush size and color
-  Real-time updates via WebSocket
-  Shared canvas with synchronized drawing across clients
-  "Clear" button that resets the canvas for all users
-  Automatically receives draw history when connecting

##  Technologies

- [React](https://reactjs.org/)
- [p5.js](https://p5js.org/) (drawing library)
- Native WebSocket API

##  Project Structure
```
src/
├── App.jsx # Main React component
├── index.css # Styles
└── index.js # Entry point
```

## Running the App Locally

###  Clone the Repository

```bash
git clone <https://github/Daniel-Aldana10/board>
cd board
```
### Install Dependencies
```bash
npm install
```
### Start the Development Server
```bash
npm run dev
```
---

## Author

Daniel Aldana — [GitHub](https://github.com/Daniel-Aldana10)

---
