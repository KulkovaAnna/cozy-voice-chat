import { Avatar } from "@cvc/components";
import { useSetting } from "@cvc/hooks";
import { useSearchParams } from "react-router";
import * as Styles from "./Header.styles";
import { SettingsPanel } from "./ui/SettingsPanel";
import { UserName } from "./ui/UserName";

export const Header = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const avatar = useSetting((state) => state.profile.avatar);
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
    <Styles.Header id="page-header">
      <Styles.SiteLogo>
        <img height={44} width={44} src="/coza.svg" />
        <h1>Cozy Voice Chat</h1>
      </Styles.SiteLogo>
      <Styles.RightPanel>
        <UserName />
        <Styles.InvisibleButton onClick={openSettings} size={40}>
          <Avatar key="avatar" src={avatar ?? undefined} size={40} />
        </Styles.InvisibleButton>
      </Styles.RightPanel>

      {isSettingsOpen && <SettingsPanel onClose={closeSettings} />}
    </Styles.Header>
  );
};
