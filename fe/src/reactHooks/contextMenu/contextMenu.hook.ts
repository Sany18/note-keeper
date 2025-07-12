import { useCallback, useEffect, useState } from "react";

export const useContextMenu = (elementRef) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback((state?: any): void => {
    setMenuOpen(state ?? !menuOpen);
  }, [menuOpen]);

  const handleClickSomewhere = useCallback((e) => {
    const target = e.target;

    if (!(target instanceof Node) || !elementRef.current?.contains(target)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleClickSomewhere);
    document.addEventListener("click", handleClickSomewhere);
    document.addEventListener("contextmenu", handleClickSomewhere);

    return () => {
      window.removeEventListener("resize", handleClickSomewhere);
      document.removeEventListener("click", handleClickSomewhere);
      document.removeEventListener("contextmenu", handleClickSomewhere);
    };
  }, []);

  return { menuOpen, toggleMenu };
}
