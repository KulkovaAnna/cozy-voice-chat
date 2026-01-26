import { useNavigate, useParams } from "react-router";
import { Button } from "../../components/Button";
import { Form } from "../../components/Form";
import { Column } from "../../components/Column";

export const Room = () => {
  let navigate = useNavigate();
  let params = useParams();
  return (
    <>
      <Form
        onSubmit={() => {
          navigate("/");
        }}
      >
        <Column>
          <h1>Комната {params.roomId}</h1>
          <Button isPrimary type="submit">
            На главную
          </Button>
        </Column>
      </Form>
    </>
  );
};
