import { useState, useEffect } from "react";

type ThemeMode = "light" | "dark";

export const useTheme = () => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as ThemeMode) || "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  return {
    mode,
    toggleTheme,
  };
}; 