import { Header } from "../../components/Header";
import { MainContainer } from "./StartPage.styled";
import { useAuth } from "../../providers/AuthProvider";
import { EnterUserNameForm } from "../../features/EnterUserNameForm";
import { RoomConnectionForm } from "../../features/RoomConnectionForm";
import { useEffect } from "react";

interface StartPagetProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const StartPage = ({ isDarkMode, toggleTheme }: StartPagetProps) => {
  const { userName } = useAuth();
  useEffect(() => {
    localStorage.setItem("userName", userName);
  }, [userName]);

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
