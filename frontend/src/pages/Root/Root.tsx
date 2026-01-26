import { Header } from "../../components/Header";
import { MainContainer } from "./Root.styled";
import { Outlet } from "react-router";

interface RootProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Root = ({ isDarkMode, toggleTheme }: RootProps) => {
  return (
    <>
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <MainContainer>
        <Outlet />
      </MainContainer>
    </>
  );
};
