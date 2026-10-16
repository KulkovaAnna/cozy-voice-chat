import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { API_URLS } from "@cvc/api/config";
import { useClickOutside } from "@cvc/hooks";
import { computeSlashState } from "./slashState";
import * as Styles from "./CommandSuggest.styles";

const SUGGEST_ID = "command-suggest";
const DEBOUNCE_MS = 200;
/** Сколько команд показывать сразу после ввода «/» */
const INITIAL_LIMIT = 3;
/** Сколько команд показывать при поиске */
const SEARCH_LIMIT = 5;

export interface SlashCommandInfo {
  name: string;
  description: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type CommandSuggestProps = {
  /** Текущий текст инпута */
  text: string;
  /** Обработчик выбора команды (имя команды без слэша) */
  onSelect: (command: string) => void;
};

export function CommandSuggest(props: CommandSuggestProps) {
  const [items, setItems] = useState<SlashCommandInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const { visible, openMenu, closeMenu } = useClickOutside(SUGGEST_ID);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const slash = useMemo(() => computeSlashState(props.text), [props.text]);

  const fetchCommands = useCallback((query: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const id = ++reqIdRef.current;
    const isSearch = query.length > 0;
    const limit = isSearch ? SEARCH_LIMIT : INITIAL_LIMIT;

    timerRef.current = setTimeout(
      () => {
        if (id !== reqIdRef.current) return;

        setLoading(true);
        setError(false);
        fetch(
          `${API_URLS.BASE_URL}/slash-commands?q=${encodeURIComponent(query)}&page=1&limit=${limit}`,
        )
          .then((r) => r.json())
          .then((data: PaginatedResult<SlashCommandInfo>) => {
            if (id !== reqIdRef.current) return;
            setItems(data.items);
            setLoading(false);
          })
          .catch(() => {
            if (id !== reqIdRef.current) return;
            setError(true);
            setLoading(false);
          });
      },
      isSearch ? DEBOUNCE_MS : 0,
    );
  }, []);

  // Запускаем fetch при изменении slash-state
  useEffect(() => {
    if (slash.active) {
      fetchCommands(slash.query);
    } else {
      // Слэш ушёл — сбрасываем и отменяем незавершённые запросы
      ++reqIdRef.current;
      timerRef.current = setTimeout(() => {
        setItems([]);
        setLoading(false);
        setError(false);
      }, 0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slash.active, slash.query, fetchCommands]);

  // Показываем подсказку пока активен слэш и есть результаты / загрузка
  useEffect(() => {
    if (slash.active && (items.length > 0 || loading || error)) {
      openMenu();
    } else {
      closeMenu();
    }
  }, [slash.active, items.length, loading, error, openMenu, closeMenu]);

  const handleSelect = (name: string) => {
    props.onSelect(name + " ");
    closeMenu();
  };

  return (
    <Styles.Wrapper id={SUGGEST_ID}>
      {visible && (
        <Styles.Popover>
          {loading && <Styles.Placeholder>Загрузка...</Styles.Placeholder>}
          {error && (
            <Styles.Placeholder>Не удалось загрузить</Styles.Placeholder>
          )}
          {!loading &&
            !error &&
            items.map((cmd) => (
              <Styles.Item
                key={cmd.name}
                onClick={() => handleSelect(cmd.name)}
              >
                <Styles.ItemName>/{cmd.name}</Styles.ItemName>
                <Styles.ItemDesc>{cmd.description}</Styles.ItemDesc>
              </Styles.Item>
            ))}
          {!loading && !error && items.length === 0 && (
            <Styles.Placeholder>Ничего не найдено</Styles.Placeholder>
          )}
        </Styles.Popover>
      )}
    </Styles.Wrapper>
  );
}
