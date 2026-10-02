import { Outlet } from "react-router";

import { Header } from "@cvc/widgets";
import * as Styles from "./Root.styles";

export const Root = () => {
  return (
    <>
      <Header />
      <Styles.MainContainer>
        <Outlet />
      </Styles.MainContainer>
    </>
  );
};
