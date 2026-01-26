import { Header } from "../../components/Header";
import { MainContainer } from "./StartPage.styled";
import { EnterUserNameForm } from "../../features/EnterUserNameForm";
import { RoomConnectionForm } from "../../features/RoomConnectionForm";

interface StartPagetProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const StartPage = ({ isDarkMode, toggleTheme }: StartPagetProps) => {
  return (
    <>
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <MainContainer>
        <EnterUserNameForm />
        <RoomConnectionForm />
      </MainContainer>
    </>
  );
};

export default StartPage;
