import { Outlet } from "react-router";
import { Header } from "../../features/Header";
import { MainContainer } from "./Root.styled";

export const Root = () => {
  return (
    <>
      <Header />
      <MainContainer>
        <Outlet />
      </MainContainer>
    </>
  );
};
