import { useRef, useState } from "react";
import { toast } from "react-toastify";

import { Button, ColorInput, Range, Select } from "@cvc/components";
import type { BackgroundType, CardBackground } from "@cvc/types";
import { uploadProfileFile } from "@cvc/api";

import * as Styles from "./BackgroundPicker.styles";
import { BACKGROUND_TYPE_OPTIONS } from "./constants";
import { Label } from "../Label";

interface BackgroundPickerProps {
  label: string;
  value: CardBackground;
  onChange: (background: CardBackground) => void;
}

export function BackgroundPicker(props: BackgroundPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const changeType = (type: BackgroundType) => {
    props.onChange({ ...props.value, type });
  };

  const changeColor = (color: string) => {
    props.onChange({ ...props.value, color });
  };

  const changeTransparency = (transparency: number) => {
    props.onChange({ ...props.value, imageOpacity: 1 - transparency });
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await uploadProfileFile(file);
      props.onChange({ ...props.value, image: url });
    } catch {
      toast("Не удалось загрузить картинку", { type: "error" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadImage(file);
  };

  const removeImage = () => {
    props.onChange({ ...props.value, image: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Styles.Container>
      <Label>{props.label}</Label>
      <Styles.Row>
        <Select
          options={BACKGROUND_TYPE_OPTIONS}
          value={props.value.type}
          onChange={(value) => changeType(value as BackgroundType)}
          aria-label={`Тип фона: ${props.label}`}
        />
        {props.value.type === "color" && (
          <ColorInput
            value={props.value.color ?? "#7B5FC6"}
            onChange={changeColor}
            aria-label="Цвет фона"
          />
        )}
        {props.value.type === "image" && (
          <>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading
                ? "Загрузка..."
                : props.value.image
                  ? "Заменить картинку"
                  : "Выбрать картинку"}
            </Button>
            {props.value.image && (
              <Styles.RemoveButton type="button" onClick={removeImage}>
                Удалить
              </Styles.RemoveButton>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </>
        )}
      </Styles.Row>
      {props.value.type === "image" && props.value.image && (
        <Styles.Row>
          <Label>Прозрачность фона</Label>
          <Range
            min={0}
            max={0.95}
            step={0.05}
            value={1 - (props.value.imageOpacity ?? 1)}
            onChange={changeTransparency}
            aria-label={`Прозрачность фона: ${props.label}`}
          />
          <Styles.OpacityValue>
            {Math.round((1 - (props.value.imageOpacity ?? 1)) * 100)}%
          </Styles.OpacityValue>
        </Styles.Row>
      )}
    </Styles.Container>
  );
}
