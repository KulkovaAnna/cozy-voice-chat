import "./AppContent.css";
import { Button } from "./components/Button";
import { Input } from "./components/Input/Input.styled";
import { Card } from "./components/Card";
import { Header } from "./components/Header";
import { IconButton } from "./components/IconButton";
import { Icons } from "./components/IconButton/constants";
import { Column } from "./components/Column";

interface AppContentProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppContent = ({ isDarkMode, toggleTheme }: AppContentProps) => {
  return (
    <>
      <Header>
        <h1>Cozy Voice Chat</h1>
        <IconButton
          icon={isDarkMode ? Icons.lightTheme : Icons.darkTheme}
          onClick={toggleTheme}
        />
      </Header>
      <div className={"mainContainer"}>
        <Card>
          <Column align="center">
            <Input placeholder="Код комнаты" />
            <Button isPrimary>Присоединиться</Button>
          </Column>
          <Column align="center" hasLine>
            <Button>Создать</Button>
          </Column>
        </Card>
      </div>
    </>
  );
};

export default AppContent;
