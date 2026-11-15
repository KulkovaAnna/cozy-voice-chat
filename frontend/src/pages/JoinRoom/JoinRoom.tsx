import { useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";

import { Button, Card, Column } from "@cvc/components";
import { useAuth, useChatNetwork } from "@cvc/providers";

const PENDING_JOIN_KEY = "cvc:join-room";

/** Вход в групповую комнату по ссылке /join/:code */
export const JoinRoom = () => {
  const { code = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { callInfo, joinRoomByCode, roomJoinError, clearRoomJoinError } =
    useChatNetwork();
  const requestedRef = useRef(false);

  // Переживает переход на логин и перезагрузку страницы
  useEffect(() => {
    if (!user.name && code) {
      sessionStorage.setItem(PENDING_JOIN_KEY, code);
    }
  }, [code, user.name]);

  useEffect(() => {
    if (user.name) {
      sessionStorage.removeItem(PENDING_JOIN_KEY);
    }
  }, [user.name]);

  useEffect(() => {
    if (!user.name || callInfo || requestedRef.current) return;

    requestedRef.current = true;
    joinRoomByCode(code);
  }, [callInfo, code, joinRoomByCode, user.name]);

  useEffect(() => {
    if (callInfo) {
      navigate(`/call/${callInfo.id}`, { replace: true });
    }
  }, [callInfo, navigate]);

  if (!user.name) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <Card direction="column">
      <Column align="center">
        <h2>Комната {code.toUpperCase()}</h2>
        <p>{roomJoinError ?? "Подключаемся…"}</p>
        <Button
          onClick={() => {
            clearRoomJoinError();
            navigate("/");
          }}
        >
          Вернуться в лобби
        </Button>
      </Column>
    </Card>
  );
};
