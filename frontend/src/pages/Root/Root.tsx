import { Header } from "../../components/Header";
import { MainContainer } from "./Root.styled";
import { Outlet } from "react-router";

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
