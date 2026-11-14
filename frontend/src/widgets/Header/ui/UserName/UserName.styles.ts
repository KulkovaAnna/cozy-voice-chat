import styled from "@emotion/styled";

// Имя не должно растягивать шапку: длинное имя обрезается эллипсисом,
// а на мобильных вместо него и так остаётся только аватар.
export const UserName = styled.p(({ theme }) => ({
  maxWidth: 200,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  [`@media screen and (max-width: ${theme.breakpoints.mobile})`]: {
    display: "none",
  },
}));