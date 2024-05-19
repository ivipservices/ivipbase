import React, { useEffect } from "react";
import { mdiChevronLeftCircle } from "@mdi/js";
import SvgIcon from "./SvgIcon.jsx";

export const MountPage = ({ title, header, toBack, children, isCard }) => {
	useEffect(() => {
		document.title = `Painel - ${title}` ?? "Painel de Banco de Dados";
	}, [title]);

	return (
		<div className="page">
			<div className="header">
				<div className="feature"></div>
				<div className="content">
					{title && (
						<h1>
							{typeof toBack === "function" && (
								<SvgIcon
									onClick={toBack}
									path={mdiChevronLeftCircle}
								/>
							)}
							<spna>{title}</spna>
						</h1>
					)}
					{header}
				</div>
			</div>
			<div className={["body", isCard ? "card" : ""].join(" ")}>{children}</div>
		</div>
	);
};

export default MountPage;
