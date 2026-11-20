// README: StaggeredGrid.count(crossAxisCount: 4, mainAxisSpacing: 4, crossAxisSpacing: 4, children: const [
//           StaggeredGridTile.count(crossAxisCellCount: 2, mainAxisCellCount: 2, child: Tile(index: 0)), ...])
import { For } from "solid-js";
import { Text, View } from "solid-fuse";
import { StaggeredGridCount, StaggeredGridTileCount } from "~/_generated/flutter_staggered_grid_view";

const Tile = (p: { index: number }) => (
  <View decoration={{ color: "#4caf50" }} alignment="center"><Text>{`${p.index}`}</Text></View>
);
const cells: [number, number][] = [[2, 2], [2, 1], [1, 1], [1, 1], [4, 2]];

export const Grid = () => (
  <StaggeredGridCount crossAxisCount={4} mainAxisSpacing={4} crossAxisSpacing={4}>
    <For each={cells}>
      {(c, i) => (
        <StaggeredGridTileCount crossAxisCellCount={c[0]} mainAxisCellCount={c[1]}>
          <Tile index={i()} />
        </StaggeredGridTileCount>
      )}
    </For>
  </StaggeredGridCount>
);
