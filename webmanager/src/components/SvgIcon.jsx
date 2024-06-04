import React from "react";
import { SvgIcon as MuiSvgIcon } from "@mui/material";

export const SvgIcon = ({ path, children, ...props }) => {
	return (
		<MuiSvgIcon {...props}>
			{typeof path === "string" && <path d={path} />}
			{children}
		</MuiSvgIcon>
	);
};

export default SvgIcon;
