import React from "react";
import { mdiXml } from "@mdi/js";
import { SvgIcon } from "./SvgIcon.jsx";

export const ProjectCard = ({ title, label, disabled = false, onClick, ...props }) => {
	return (
		<div
			className={["project-card", disabled ? "disabled" : ""].join(" ")}
			{...props}
			onClick={disabled ? undefined : onClick}
		>
			<h3>{title}</h3>
			<p>{label}</p>
			<div className="space"></div>
			<SvgIcon path={mdiXml} />
		</div>
	);
};

export default ProjectCard;
