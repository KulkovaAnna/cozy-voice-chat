export interface AppTheme {
  name: string;
  colors: {
    primary: {
      main: string;
      light: string;
      dark: string;
      contrast: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
    };
    background: {
      default: string;
      paper: string;
      darker: string;
      card: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    // Для голосового чата
    voice: {
      speaking: string;
      muted: string;
      connecting: string;
    };
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
  };
  spacing: {
    unit: number;
    layout: {
      small: string;
      medium: string;
      large: string;
    };
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    circle: string;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  zIndex: {
    modal: number;
    tooltip: number;
    notification: number;
  };
  // Медиа-запросы для адаптивности
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
  // Анимации
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
}

// Светлая тема
export const lightTheme: AppTheme = {
  name: "light",
  colors: {
    primary: {
      main: "#b298e7",
      light: "#c5b1ec",
      dark: "#997bd3",
      contrast: "#000000",
    },
    secondary: {
      main: "#b8e3e9",
      light: "#cbf2f7",
      dark: "#8ec2c9",
    },
    background: {
      default: "#F2F2F7",
      paper: "#FFFFFF",
      darker: "#E5E5EA",
      card: "#f5b8d5",
    },
    text: {
      primary: "#000000",
      secondary: "#3C3C4399",
      disabled: "#3C3C434D",
    },
    status: {
      success: "#34C759",
      warning: "#FF9500",
      error: "#FF3B30",
      info: "#007AFF",
    },
    voice: {
      speaking: "#30D158",
      muted: "#FF3B30",
      connecting: "#FF9500",
    },
  },
  typography: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      xxl: "1.5rem",
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  spacing: {
    unit: 8,
    layout: {
      small: "16px",
      medium: "24px",
      large: "32px",
    },
  },
  borderRadius: {
    small: "4px",
    medium: "8px",
    large: "12px",
    circle: "50%",
  },
  shadows: {
    small: "0 2px 8px rgba(0,0,0,0.1)",
    medium: "0 4px 16px rgba(0,0,0,0.12)",
    large: "0 8px 24px rgba(0,0,0,0.14)",
  },
  zIndex: {
    modal: 1000,
    tooltip: 1100,
    notification: 1200,
  },
  breakpoints: {
    mobile: "480px",
    tablet: "768px",
    desktop: "1024px",
  },
  transitions: {
    fast: "150ms ease",
    normal: "250ms ease",
    slow: "350ms ease",
  },
};

// Темная тема
export const darkTheme: AppTheme = {
  ...lightTheme,
  name: "dark",
  colors: {
    ...lightTheme.colors,
    primary: {
      main: "#997bd3",
      light: "#b298e7",
      dark: "#785cb1",
      contrast: "#fafafa",
    },
    secondary: {
      main: "#41a5b3",
      light: "#b8e3e9",
      dark: "#6fa5ac",
    },
    background: {
      default: "#000000",
      paper: "#1C1C1E",
      darker: "#2C2C2E",
      card: "#242425",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#EBEBF599",
      disabled: "#EBEBF54D",
    },
  },
};

export type Theme = AppTheme;
