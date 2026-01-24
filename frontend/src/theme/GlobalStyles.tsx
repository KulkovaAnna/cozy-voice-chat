import { Global, css } from "@emotion/react";
import { useTheme } from "@emotion/react";

export const GlobalStyles = () => {
  const theme = useTheme();

  return (
    <Global
      styles={css`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          height: 100%;
          width: 100%;
          font-family: ${theme.typography.fontFamily};
          font-size: ${theme.typography.fontSize.md};
        }

        body {
          background-color: ${theme.colors.background.default};
          color: ${theme.colors.text.primary};
          transition:
            background-color ${theme.transitions.normal},
            color ${theme.transitions.normal};
          overflow-x: hidden;
        }

        #root {
          min-height: 100vh;
          margin: 0 auto;
          padding: 4rem;
          text-align: center;
          background: ${theme.name === "dark"
            ? `linear-gradient(135deg, 
                 ${theme.colors.background.darker} 0%, 
                 ${theme.colors.background.default} 100%)`
            : theme.colors.background.default};
        }

        ::-webkit-scrollbar {
          width: 10px;
        }

        ::-webkit-scrollbar-track {
          background: ${theme.colors.background.darker};
        }

        ::-webkit-scrollbar-thumb {
          background: ${theme.colors.primary.main};
          border-radius: ${theme.borderRadius.small};
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.colors.primary.dark};
        }

        ::selection {
          background-color: ${theme.colors.primary.light};
          color: ${theme.colors.primary.contrast};
        }

        main {
          background-color: ${theme.colors.background.paper};
          border-radius: ${theme.borderRadius.medium};
          padding: ${theme.spacing.layout.medium};
          margin: ${theme.spacing.layout.medium};
          box-shadow: ${theme.shadows.small};
        }
      `}
    />
  );
};
