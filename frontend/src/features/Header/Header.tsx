import * as Styled from "./Header.styled";
import { Avatar } from "../../components/Avatar";
import { useState } from "react";
import { UserMenu } from "../UserMenu";
import { UserName } from "../../components/UserName";
import { useAuth } from "../../providers/AuthProvider";

export const Header = () => {
  const [isShowMenu, setIsShowMenu] = useState(false);
  const { user } = useAuth();

  return (
    <Styled.Header id="page-header">
      <h1>Cozy Voice Chat</h1>
      <Styled.RightPanel>
        <UserName />
        <Styled.InvisibleButton
          onClick={() => {
            setIsShowMenu((prev) => !prev);
          }}
          size={40}
        >
          <Avatar key="avatar" src={user.avatar} size={40} />
        </Styled.InvisibleButton>

        {isShowMenu && <UserMenu />}
      </Styled.RightPanel>
    </Styled.Header>
  );
};
