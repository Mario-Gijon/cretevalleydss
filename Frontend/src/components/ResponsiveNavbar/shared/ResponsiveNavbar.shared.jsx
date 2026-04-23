import { Badge, Slide, SvgIcon, useScrollTrigger } from "@mui/material";
import { styled } from "@mui/material/styles";

import LogoSVG from "../../../assets/logo.svg?react";

export const StyledBadge = styled(Badge)(() => ({
  "& .MuiBadge-badge": {
    right: -1,
    top: 10,
  },
}));

export const LogoIcon = (props) => {
  return <SvgIcon component={LogoSVG} viewBox="0 0 200 200" {...props} />;
};

/**
 * Hide app bar while scrolling down.
 *
 * @param {object} props Component props.
 * @param {*} props.children App bar content.
 * @param {Function} [props.window] Optional target window getter.
 * @returns {*}
 */
export const HideOnScroll = (props) => {
  const { children, window } = props;
  const trigger = useScrollTrigger({ target: window ? window() : undefined });

  return <Slide appear={false} direction="down" in={!trigger}>{children ?? <div />}</Slide>;
};
