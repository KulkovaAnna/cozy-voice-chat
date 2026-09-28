import { Avatar, UserName } from "@cvc/components";
import { SettingsPanel } from "@cvc/features/SettingsPanel";
import { useAuth } from "@cvc/providers";
import { useSearchParams } from "react-router";
import * as Styled from "./Header.styled";

export const Header = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isSettingsOpen = searchParams.get("settings") === "open";

  const openSettings = () => {
    setSearchParams((prev) => {
      prev.set("settings", "open");
      return prev;
    });
  };

  const closeSettings = () => {
    setSearchParams((prev) => {
      prev.delete("settings");
      return prev;
    });
  };

  return (
    <Styled.Header id="page-header">
      <Styled.SiteLogo>
        <img height={44} width={44} src="/coza.svg" />
        <h1>Cozy Voice Chat</h1>
      </Styled.SiteLogo>
      <Styled.RightPanel>
        <UserName />
        <Styled.InvisibleButton onClick={openSettings} size={40}>
          <Avatar key="avatar" src={user.avatar} size={40} />
        </Styled.InvisibleButton>
      </Styled.RightPanel>

      {isSettingsOpen && <SettingsPanel onClose={closeSettings} />}
    </Styled.Header>
  );
};
