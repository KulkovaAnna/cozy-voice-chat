import { Button } from "./components/Button";
import { Input } from "./components/Input/Input.styled";
import { Card } from "./components/Card";
import { Header } from "./components/Header";
import { Column } from "./components/Column";
import { MainContainer } from "./AppContent.styled";

interface AppContentProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppContent = ({ isDarkMode, toggleTheme }: AppContentProps) => {
  return (
    <>
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <MainContainer>
        <Card>
          <Column align="center">
            <Input placeholder="Код комнаты" />
            <Button isPrimary>Присоединиться</Button>
          </Column>
          <Column align="center" hasLine>
            <Button>Создать</Button>
          </Column>
        </Card>
      </MainContainer>
    </>
  );
};

export default AppContent;
