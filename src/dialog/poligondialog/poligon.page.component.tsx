import { Stack } from "@fluentui/react/lib/Stack";
import { DefaultButton, PrimaryButton } from "@fluentui/react/lib/Button";
import PoligonApiTask from "export/POLIGON/poligon.task";
import { stackTokens } from "common/const/stack.const";
import React from "react";
import { TaskRequestResponse } from "common/model/poligon.model";
import { emptyTaskResponse } from "common/const/task.const";

type Props = {};

export const PoligonPage = (props: Props) => {
  const [response, setResponse] = React.useState(emptyTaskResponse);
  return (
    <Stack tokens={stackTokens}>
      <Stack
        horizontal
        style={{ marginTop: 30 }}
        horizontalAlign="start"
        tokens={stackTokens}
      >
        <Stack.Item>
          <PrimaryButton
            onClick={async (e) => {
              setResponse(await new PoligonApiTask().execute());
            }}
            text="Send"
          ></PrimaryButton>
        </Stack.Item>
        <Stack.Item>
          <DefaultButton
            onClick={async (e) => {}}
            text="Cancel"
          ></DefaultButton>
        </Stack.Item>
      </Stack>
      <div>{`${response.code}: ${response.message}`}</div>
    </Stack>
  );
};
