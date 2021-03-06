import React from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import styles from "./styles.css";

import BaseComponent from "BaseComponent";

import SongListItem from "SongListItem";

export default function Component(props) {
  return (
    <div className={styles.Component}>
      <div>{props.id}</div>
      <div>{props.username}</div>
      <div>{props.songName}</div>

      <NavLink to={`/${props.id}`}>
        <button>contribute</button>
      </NavLink>
      <button>play</button>
    </div>
  );
}
