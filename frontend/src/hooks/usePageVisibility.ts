import { useEffect, useState } from "react";

export function usePageVisibility() {
  const [isTabInFocus, setIsTabInFocus] = useState(true);

  useEffect(() => {
    const listener = () => {
      setIsTabInFocus(!document.hidden);
    };
    document.addEventListener("visibilitychange", listener);

    return () => {
      document.removeEventListener("visibilitychange", listener);
    };
  }, []);

  return isTabInFocus;
}
