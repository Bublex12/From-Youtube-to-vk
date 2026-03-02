import { useEffect, useState } from "react";
import type { VkSession, VkGroup } from "../api.ts";
import {
  fetchVkAuthUrl,
  fetchVkSession,
  fetchVkGroups,
  selectVkGroup,
  vkLogout,
} from "../api.ts";

interface Props {
  session: VkSession | null;
  onSessionChange: (session: VkSession | null) => void;
}

export default function VkAuth({ session, onSessionChange }: Props) {
  const [groups, setGroups] = useState<VkGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const loggedIn = session?.logged_in === true;
  const hasGroup = loggedIn && session.group_id != null;

  useEffect(() => {
    if (loggedIn && !hasGroup) {
      setLoadingGroups(true);
      fetchVkGroups()
        .then(setGroups)
        .finally(() => setLoadingGroups(false));
    }
  }, [loggedIn, hasGroup]);

  async function handleLogin() {
    try {
      const url = await fetchVkAuthUrl();
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function handleSelectGroup(group: VkGroup) {
    await selectVkGroup(group.id, group.name);
    const updated = await fetchVkSession();
    onSessionChange(updated);
  }

  async function handleLogout() {
    await vkLogout();
    onSessionChange({ logged_in: false });
    setGroups([]);
  }

  async function handleChangeGroup() {
    await selectVkGroup(0, "");
    const updated = await fetchVkSession();
    onSessionChange(updated);
    setLoadingGroups(true);
    fetchVkGroups()
      .then(setGroups)
      .finally(() => setLoadingGroups(false));
  }

  if (session?.source === "env") {
    return (
      <div className="vk-auth vk-auth--compact">
        <span className="vk-auth__user-name">Токен из .env</span>
        <span className="vk-auth__separator">&rarr;</span>
        <span className="vk-auth__group-name">{session.group_name}</span>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="vk-auth">
        <button className="vk-auth__login-btn" onClick={handleLogin}>
          Войти через ВКонтакте
        </button>
      </div>
    );
  }

  if (!hasGroup) {
    return (
      <div className="vk-auth">
        <div className="vk-auth__user">
          <span className="vk-auth__user-name">{session.user_name}</span>
          <button className="vk-auth__logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>

        <div className="vk-auth__groups">
          <div className="vk-auth__groups-title">Выберите группу:</div>
          {loadingGroups && (
            <div className="vk-auth__groups-loading">
              <span className="spinner" /> Загрузка групп...
            </div>
          )}
          {!loadingGroups && groups.length === 0 && (
            <div className="vk-auth__groups-empty">
              Нет групп с правами администратора
            </div>
          )}
          <div className="vk-auth__groups-list">
            {groups.map((g) => (
              <button
                key={g.id}
                className="vk-auth__group-item"
                onClick={() => handleSelectGroup(g)}
              >
                {g.photo && (
                  <img
                    src={g.photo}
                    alt=""
                    className="vk-auth__group-photo"
                  />
                )}
                <span>{g.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vk-auth vk-auth--compact">
      <span className="vk-auth__user-name">{session.user_name}</span>
      <span className="vk-auth__separator">→</span>
      <span className="vk-auth__group-name">{session.group_name}</span>
      <button className="vk-auth__change" onClick={handleChangeGroup}>
        Сменить
      </button>
      <button className="vk-auth__logout" onClick={handleLogout}>
        Выйти
      </button>
    </div>
  );
}
