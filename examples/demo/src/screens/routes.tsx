import { For } from "solid-js";
import { Pressable, Text, View, page, route, tabs, useNavigation, useTabs } from "solid-fuse";
import { HomeScreen } from "./home";
import { Button, MenuItem } from "../ui";

// Routes: typed params, parents, a layout with its own stack, and links.
// `nav.go("/users/2")` or the OS opening that link builds Users under User.

const people = ["Ada", "Grace", "Linus"];

/** The app's first page. */
export const Home = route({ path: "/", component: HomeScreen });

export const Users = route({
  path: "/users",
  component: () => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical" }} padding={{ top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <View padding={16}>
          <Text fontSize={24} fontWeight={700}>
            People
          </Text>
        </View>
        <For each={people}>{(name, i) => <MenuItem label={name} onTap={() => nav.push(User, { id: i() })} />}</For>
        <View padding={16}>
          <Button onTap={() => nav.go("/share/contact")}>Open /share/contact</Button>
        </View>
      </View>
    );
  },
});

export const User = route({
  path: ":id",
  parent: Users,
  parse: { id: Number },
  component: (props: { id: number }) => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text fontSize={24} fontWeight={700}>{`User ${people[props.id]}`}</Text>
        <Button onTap={() => nav.push(Share)}>Share</Button>
        <Button onTap={() => nav.pop()}>Back</Button>
      </View>
    );
  },
});

// A layout: its routes push inside it, under the banner, which stays put.
export const Share = route({
  path: "/share",
  navigator: "stack",
  page: (child) => page({ child, transition: "fade" }),
  component: (props) => (
    <View layout={{ direction: "vertical" }} decoration={{ color: "#EEF2FF" }} width={Infinity} height={Infinity}>
      <View padding={{ horizontal: 16, top: 48, bottom: 12 }}>
        <Text fontSize={20} fontWeight={700}>Share flow</Text>
      </View>
      <View flex={1}>{props.children}</View>
    </View>
  ),
});

route({
  path: "",
  parent: Share,
  component: () => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={16} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text>Share home</Text>
        <Button onTap={() => nav.push(Contact)}>Pick contact</Button>
        <Button onTap={() => nav.pop()}>Close</Button>
      </View>
    );
  },
});

const Contact = route({
  path: "contact",
  parent: Share,
  component: () => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={16} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text>Contact picker</Text>
        <Button onTap={() => nav.pop()}>Back</Button>
      </View>
    );
  },
});

// Tabs: a stack per tab, kept alive; the bar sits next to the visible one.

const FeedTab = route({
  path: "feed",
  component: () => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text fontSize={24} fontWeight={700}>Feed</Text>
        <Button onTap={() => nav.push(Post, { id: "1" })}>Open post</Button>
        <Button onTap={() => nav.push(Video, { id: "7" })}>Open video</Button>
      </View>
    );
  },
});

const ProfileTab = route({
  path: "profile",
  component: () => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text fontSize={24} fontWeight={700}>Profile</Text>
        <Button onTap={() => nav.push(Video, { id: "8" })}>Open video</Button>
        <Button onTap={() => nav.push(Settings)}>Settings</Button>
      </View>
    );
  },
});

export const TabsDemo = route({
  path: "/tabs",
  navigator: tabs(FeedTab, ProfileTab),
  component: (props) => {
    const t = useTabs();
    return (
      <View layout={{ direction: "vertical" }} width={Infinity} height={Infinity}>
        <View flex={1}>{props.children}</View>
        <View layout={{ direction: "horizontal", justify: "spaceAround" }} padding={16} decoration={{ color: "#F3F4F6" }}>
          <For each={["Feed tab", "Profile tab"]}>
            {(label, i) => (
              <Pressable onPress={() => t.select(i())}>
                <Text fontWeight={t.index() === i() ? 700 : 400}>{label}</Text>
              </Pressable>
            )}
          </For>
        </View>
      </View>
    );
  },
});

const Post = route({
  path: "post/:id",
  parent: FeedTab,
  component: (props: { id: string }) => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text fontSize={24} fontWeight={700}>{`Post ${props.id}`}</Text>
        <Button onTap={() => nav.pop()}>Back</Button>
      </View>
    );
  },
});

// Shared: opens in whichever tab pushes it.
const Video = route({
  path: "video/:id",
  parent: TabsDemo,
  component: (props: { id: string }) => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text fontSize={24} fontWeight={700}>{`Video ${props.id}`}</Text>
        <Button onTap={() => nav.push(Post, { id: props.id })}>Post about it</Button>
        <Button onTap={() => nav.pop()}>Back</Button>
      </View>
    );
  },
});

// On the root stack, over the tabs and their bar.
const Settings = route({
  path: "/settings",
  parent: Home,
  component: () => {
    const nav = useNavigation();
    return (
      <View layout={{ direction: "vertical", gap: 12 }} padding={{ horizontal: 16, top: 48 }} decoration={{ color: "#FFFFFF" }} width={Infinity} height={Infinity}>
        <Text fontSize={24} fontWeight={700}>Settings</Text>
        <Button onTap={() => nav.pop()}>Done</Button>
      </View>
    );
  },
});
