import { Link, useParams } from "react-router";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Column } from "../../components/Column";

export const Room = () => {
  const params = useParams();
  return (
    <>
      <Card>
        <Column>
          <h1>Комната {params.roomId}</h1>
          <Link to={"/"}>
            <Button isPrimary type="submit">
              На главную
            </Button>
          </Link>
        </Column>
      </Card>
    </>
  );
};
