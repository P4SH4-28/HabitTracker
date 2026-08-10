// ============================================================
// MenuContext — Sol menü (drawer) görünürlük kontrolü
// Ekranlardaki hamburger ikonu "openMenu" çağırır; AppMenu
// bileşeni (App.js kökünde) görünürlüğü okur ve paneli çizer.
// ============================================================
import { createContext, useContext, useMemo, useState } from 'react';

const MenuContext = createContext(null);

export function MenuProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const value = useMemo(
    () => ({
      visible,
      openMenu: () => setVisible(true),
      closeMenu: () => setVisible(false),
    }),
    [visible]
  );
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
}
