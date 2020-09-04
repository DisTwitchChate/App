import React, { useCallback, useState, useEffect, useContext } from "react";
import { withRouter, Link } from "react-router-dom";
import { AppContext } from "../contexts/AppContext";
import SettingsTwoToneIcon from "@material-ui/icons/SettingsTwoTone";
import SettingAccordion from "./SettingsAccordion";
import Skeleton from "@material-ui/lab/Skeleton";
import firebase from "../firebase";
import Button from "@material-ui/core/Button";
import Setting from "./Setting";
import SearchBox from "./SearchBox";
import PeopleAltTwoToneIcon from "@material-ui/icons/PeopleAltTwoTone";
import GetAppIcon from "@material-ui/icons/GetApp";
import "./Header.scss";
import compare from "semver-compare";
import ClearIcon from "@material-ui/icons/Clear";
import MailTwoToneIcon from "@material-ui/icons/MailTwoTone";
import { Tooltip, ClickAwayListener } from "@material-ui/core";
import { useInterval } from "react-use";
import { CSSTransition } from "react-transition-group";
import HomeIcon from "@material-ui/icons/Home";
import FavoriteTwoToneIcon from "@material-ui/icons/FavoriteTwoTone";
import FavoriteIcon from "@material-ui/icons/Favorite";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import VisibilityIcon from "@material-ui/icons/Visibility";
import BuildIcon from "@material-ui/icons/Build";
const { remote, ipcRenderer } = window.require("electron");
const customTitlebar = window.require("custom-electron-titlebar");

let MyTitleBar = new customTitlebar.Titlebar({
	backgroundColor: customTitlebar.Color.fromHex("#17181ba1"),
	menu: null,
	maximizable: false,
});
MyTitleBar.updateTitle("DisStreamChat");
MyTitleBar.setHorizontalAlignment("left");

const SettingList = React.memo(props => {
	return (
		<SettingAccordion>
			{Object.entries(props.defaultSettings || {})
				.filter(
					([name, data]) =>
						!data.discordSetting &&
						(!props.search
							? true
							: name
									?.match(/[A-Z][a-z]+|[0-9]+/g)
									?.join(" ")
									?.toLowerCase()
									?.includes(props?.search?.toLowerCase()))
				)
				.sort((a, b) => {
					const categoryOrder = a[1].type.localeCompare(b[1].type);
					const nameOrder = a[0].localeCompare(b[0]);
					return !!categoryOrder ? categoryOrder : nameOrder;
				})
				.map(([key, value]) => {
					return (
						<Setting
							default={value.value}
							key={key}
							onChange={props.updateSettings}
							value={props?.settings?.[key]}
							name={key}
							type={value.type}
							min={value.min}
							max={value.max}
							step={value.step}
							options={value.options}
							description={value.description}
						/>
					);
				})}
		</SettingAccordion>
	);
});

const maxDisplayNum = 999;

const Header = props => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [appSettings, setAppSettings] = useState();
	const [defaultSettings, setDefaultSettings] = useState();
	const [search, setSearch] = useState();
	const [chatHeader, setChatHeader] = useState(false);
	const [show, setShow] = useState(true);
	const currentUser = firebase.auth.currentUser;
	const id = currentUser?.uid || " ";
	const { location } = props;
	const { setShowViewers, windowFocused, streamerInfo, userData, unreadMessageIds, setUnreadMessageIds } = useContext(AppContext);
	const [viewingUserId, setViewingUserId] = useState();
	const [viewingUserInfo, setViewingUserInfo] = useState();
	const [viewingUserStats, setViewingUserStats] = useState();
	const [updateLink, setUpdateLink] = useState();
	const [isPopoutOut, setIsPopOut] = useState();
	const [unreadMessages, setUnreadMessages] = useState(false);
	const absoluteLocation = window.location;
	const [platform, setPlatform] = useState("");
	const [unreadTimeout, setUnreadTimeout] = useState(0);
	const [following, setFollowing] = useState();
	const [moreMenuOpen, setMoreMenuOpen] = useState();

	useEffect(() => {
		setUnreadTimeout(prev => {
			clearTimeout(prev);
			return setTimeout(() => {
				setUnreadMessages(!!unreadMessageIds.length);
			}, 200);
		});
	}, [setUnreadMessages, unreadMessageIds]);

	useEffect(() => {
		ipcRenderer.on("send-platform", (event, data) => setPlatform(data));
		return () => ipcRenderer.removeAllListeners("send-platform");
	}, []);

	useEffect(() => {
		(async () => {
			const currentVersion = remote.app.getVersion();
			MyTitleBar.updateTitle(`DisStreamChat ${currentVersion}`);
			const response = await fetch("https://api.github.com/repos/disstreamchat/App/releases");
			const json = await response.json();
			const latestVersionInfo = json[0];
			const latestVersion = latestVersionInfo?.tag_name;
			const updateable = compare(latestVersion || "", currentVersion || "") > 0;
			if (updateable) {
				let downLoadUrl;
				if (platform === "win32") {
					const windowsDownloadAsset = latestVersionInfo.assets[0];
					downLoadUrl = windowsDownloadAsset.browser_download_url;
				} else if (platform === "linux") {
					downLoadUrl = "https://i.lungers.com/disstreamchat/linux";
				} else if (platform === "darwin") {
					downLoadUrl = "https://i.lungers.com/disstreamchat/darwin";
				}
				setUpdateLink(downLoadUrl);
			}
		})();
	}, [platform]);

	useEffect(() => {
		setViewingUserId(location.pathname.split("/").slice(-1)[0]);
		setViewingUserStats();
	}, [location]);

	useEffect(() => {
		(async () => {
			if (chatHeader && show) {
				try {
					const apiUrl = `${process.env.REACT_APP_SOCKET_URL}/resolveuser?user=${viewingUserId}&platform=twitch`;
					const response = await fetch(apiUrl);
					const userData = await response.json();
					setViewingUserInfo(userData);
				} catch (err) {
					console.log(err.message);
				}
			}
		})();
	}, [chatHeader, show, viewingUserId]);

	const getStats = useCallback(async () => {
		if (viewingUserInfo) {
			const ApiUrl = `${process.env.REACT_APP_SOCKET_URL}/stats/twitch/?name=${viewingUserInfo?.display_name?.toLowerCase?.()}&new=true`;
			const response = await fetch(ApiUrl);
			const data = await response.json();
			setViewingUserStats(prev => {
				if (data) {
					return {
						name: viewingUserInfo.display_name,
						viewers: data.viewer_count,
						isLive: data.isLive,
					};
				} else {
					return {
						name: viewingUserInfo.display_name,
						viewers: 0,
						isLive: false,
					};
				}
			});
		}
	}, [viewingUserInfo]);

	useEffect(() => {
		if (viewingUserInfo) {
			getStats();
		}
	}, [getStats, viewingUserInfo]);

	useInterval(getStats, 60000);

	useEffect(() => {
		setChatHeader(location?.pathname?.includes("chat"));
		setShow(!location?.pathname?.includes("login"));
		setIsPopOut(new URLSearchParams(location?.search).has("popout"));
	}, [location, absoluteLocation]);

	useEffect(() => {
		(async () => {
			const settingsRef = await firebase.db.collection("defaults").doc("settings16").get();
			const settingsData = settingsRef.data().settings;
			setDefaultSettings(settingsData);
		})();
	}, []);

	useEffect(() => {
		const data = userData;
		if (data) {
			setAppSettings(data.appSettings);
		}
	}, [userData]);

	const updateAppSetting = useCallback(
		async (name, value) => {
			const copy = { ...appSettings };
			copy[name] = value;
			setAppSettings(copy);
			const userRef = firebase.db.collection("Streamers").doc(id);
			await userRef.update({
				appSettings: copy,
			});
		},
		[appSettings, id]
	);

	const signout = useCallback(async () => {
		await firebase.logout();
		props.history.push("/");
	}, [props.history]);

	return !show ? (
		<></>
	) : (
		<CSSTransition in={streamerInfo?.HideHeaderOnUnfocus ? windowFocused : true} timeout={100} unmountOnExit classNames="header-node">
			<header className={`header ${settingsOpen && "open"}`}>
				<nav className="nav">
					{chatHeader && (
						<>
							<div className="stats">
								<div className={`live-status ${viewingUserStats?.isLive ? "live" : ""}`}></div>
								{!viewingUserStats ? (
									<Skeleton variant="text" animation="wave" />
								) : (
									<a href={`https://twitch.tv/${viewingUserStats?.name?.toLowerCase?.()}`} className="name">
										{viewingUserStats?.name}
									</a>
								)}
							</div>
						</>
					)}
					<div className="all-icons">
						<div className="icons icons-left">
							<Tooltip arrow title={`${following ? "Unfollow" : "Follow"}`}>
								<div>{following ? <FavoriteIcon /> : <FavoriteTwoToneIcon />}</div>
							</Tooltip>
							<Tooltip arrow title="Channel details">
								<div>
									<VisibilityIcon />
								</div>
							</Tooltip>
							<Tooltip arrow title={`${unreadMessages ? "Mark as Read" : "No unread Messages"}`} arrow>
								<div onClick={() => setUnreadMessageIds([])} className={`messages-notification ${unreadMessages ? "unread" : ""}`}>
									{(unreadMessages) ? (unreadMessageIds.length > maxDisplayNum ? `${maxDisplayNum}+` : unreadMessageIds.length) : ""}
									{unreadMessages ? " " : ""}
									<MailTwoToneIcon />
								</div>
							</Tooltip>
							<Tooltip arrow title="Viewers in Chat">
								<div className={"live-viewers"} onClick={() => setShowViewers(true)}>
									<PeopleAltTwoToneIcon />
									{viewingUserStats?.viewers}
								</div>
							</Tooltip>
						</div>

						<div className={`icons ${chatHeader ? "bl-light" : ""}`}>
							{chatHeader ? (
								<>
									{!isPopoutOut && (
										<Tooltip arrow title="Channels">
											<Link to="/channels">{isPopoutOut ? <ClearIcon /> : <HomeIcon />}</Link>
										</Tooltip>
									)}
								</>
							) : (
								<Button variant="contained" color="primary" onClick={signout}>
									Sign Out
								</Button>
							)}
							<Tooltip arrow title={`${settingsOpen ? "Close" : ""} Settings`}>
								<button className="clear" onClick={() => setSettingsOpen(o => !o)}>
									{!settingsOpen ? <SettingsTwoToneIcon /> : <ClearIcon />}
								</button>
							</Tooltip>

							<ClickAwayListener onClickAway={() => setMoreMenuOpen(false)}>
								<div className="more">
									<Tooltip arrow title="More">
										<button onClick={() => setMoreMenuOpen(prev => !prev)}>
											<MoreVertIcon />
										</button>
									</Tooltip>
									<CSSTransition in={moreMenuOpen} unmountOnExit>
										<div className="menu">
											<div className="menu-item">Open In Browser</div>
											<div className="menu-item">Open In Popout</div>
											<div className="menu-item">sub</div>
										</div>
									</CSSTransition>
								</div>
							</ClickAwayListener>

							{updateLink && (
								<Tooltip arrow title="update available" arrow>
									<button
										id="update-link"
										onClick={() => {
											ipcRenderer.send("update");
										}}
									>
										<GetAppIcon></GetAppIcon>
										<div id="notification-light"></div>
									</button>
								</Tooltip>
							)}
						</div>
					</div>
				</nav>
				<div className="header-settings">
					<SearchBox value={search} onChange={setSearch} placeHolder="Search Settings" />
					<SettingList all search={search} defaultSettings={defaultSettings} settings={appSettings} updateSettings={updateAppSetting} />
				</div>
			</header>
		</CSSTransition>
	);
};

export default withRouter(React.memo(Header));
