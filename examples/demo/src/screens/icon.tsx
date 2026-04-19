import { createSignal } from "solid-js";
import { useNavigator } from "solid-fuse";
import * as md from "solid-fuse/icons/material";
import { Button, Row } from "../ui";

export function IconScreen() {
  const nav = useNavigator();
  const [size, setSize] = createSignal(32);
  const [color, setColor] = createSignal("#111827");

  return (
    <materialPage>
      <scrollView flex={{ direction: "vertical", gap: 16 }}>
        <view padding={{ horizontal: 16, top: 16, bottom: 8 }}>
          <text fontSize={24} fontWeight="bold">
            icon
          </text>
          <text color="#6B7280" fontSize={14}>
            Baseline icon rendering + reactive props
          </text>
        </view>

        <view padding={{ horizontal: 16 }} flex={{ direction: "vertical", gap: 24 }}>
          {/* Static grid — if any of these don't render, the primitive is broken */}
          <view flex={{ direction: "vertical", gap: 6 }}>
            <text fontWeight="semiBold">Static grid</text>
            <view flex={{ direction: "horizontal", gap: 16, align: "center" }}>
              <icon data={md.search} size={32} />
              <icon data={md.lock} size={32} />
              <icon data={md.home} size={32} />
              <icon data={md.settings} size={32} />
              <icon data={md.favorite} size={32} color="#EF4444" />
              <icon data={md.star} size={32} color="#F59E0B" />
            </view>
          </view>

          {/* Reactive size + color */}
          <view flex={{ direction: "vertical", gap: 6 }}>
            <text fontWeight="semiBold">Reactive props</text>
            <view
              flex={{ direction: "horizontal", gap: 12, align: "center" }}
              padding={12}
            >
              <icon data={md.favorite} size={size()} color={color()} />
              <text color="#6B7280" fontSize={13}>
                size = {size()}, color = {color()}
              </text>
            </view>
            <Row>
              <Button onTap={() => setSize(16)}>16</Button>
              <Button onTap={() => setSize(32)}>32</Button>
              <Button onTap={() => setSize(64)}>64</Button>
            </Row>
            <Row>
              <Button onTap={() => setColor("#EF4444")}>red</Button>
              <Button onTap={() => setColor("#10B981")}>green</Button>
              <Button onTap={() => setColor("#3B82F6")}>blue</Button>
            </Row>
          </view>

          {/* Icon inside a view — exercises the "orphan has its own children" path
              from the other direction: normal composition, should just work */}
          <view flex={{ direction: "vertical", gap: 6 }}>
            <text fontWeight="semiBold">Icon + text row</text>
            <view
              flex={{ direction: "horizontal", gap: 8, align: "center" }}
              padding={12}
            >
              <icon data={md.info} size={20} color="#3B82F6" />
              <text>Inline icon + text composition</text>
            </view>
          </view>
        </view>

        <view padding={16}>
          <Button onTap={() => nav.pop()}>Back</Button>
        </view>
      </scrollView>
    </materialPage>
  );
}
