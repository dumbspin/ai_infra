import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import CliDocsPage from "./CliDocsPage";
import Cockpit from "./Cockpit";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/cli" element={<CliDocsPage />} />
        <Route path="/docs" element={<CliDocsPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/landing.html" element={<LandingPage />} />
        <Route path="/cockpit" element={<Cockpit />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}