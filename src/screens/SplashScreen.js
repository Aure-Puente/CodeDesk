//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

//Assets:
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");

//Colores splash oscuro:
const DARK_SPLASH_BACKGROUND = "#0B111E";
const DARK_SPLASH_CARD = "#151D2E";
const DARK_SPLASH_PRIMARY = "#2563EB";
const DARK_SPLASH_SECONDARY = "#A7B0C2";
const DARK_SPLASH_BORDER = "rgba(148, 163, 184, 0.18)";
const DARK_GLOW_TOP = "rgba(37, 99, 235, 0.045)";
const DARK_GLOW_BOTTOM = "rgba(37, 99, 235, 0.035)";
const DARK_FOOTER = "rgba(167, 176, 194, 0.72)";

//Colores splash claro:
const LIGHT_SPLASH_BACKGROUND = "#F9F9F9";
const LIGHT_SPLASH_CARD = "#FFFFFF";
const LIGHT_SPLASH_PRIMARY = "#2563EB";
const LIGHT_SPLASH_SECONDARY = "#64748B";
const LIGHT_SPLASH_BORDER = "rgba(15, 23, 42, 0.1)";
const LIGHT_GLOW_TOP = "rgba(37, 99, 235, 0.055)";
const LIGHT_GLOW_BOTTOM = "rgba(37, 99, 235, 0.035)";
const LIGHT_FOOTER = "rgba(100, 116, 139, 0.82)";

//Config logo:
const LOGO_ZOOM = 3.2;
const CONTENT_OFFSET_Y = 12;

export default function SplashScreen({ theme }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const translateAnim = useRef(new Animated.Value(10)).current;

    const isDark = theme?.dark ?? true;

    const logoSource = isDark ? logoDark : logoLight;

    const splashBackground = isDark
        ? DARK_SPLASH_BACKGROUND
        : LIGHT_SPLASH_BACKGROUND;

    const splashCard = isDark ? DARK_SPLASH_CARD : LIGHT_SPLASH_CARD;
    const splashPrimary = isDark ? DARK_SPLASH_PRIMARY : LIGHT_SPLASH_PRIMARY;

    const splashSecondary = isDark
        ? DARK_SPLASH_SECONDARY
        : LIGHT_SPLASH_SECONDARY;

    const splashBorder = isDark ? DARK_SPLASH_BORDER : LIGHT_SPLASH_BORDER;
    const glowTop = isDark ? DARK_GLOW_TOP : LIGHT_GLOW_TOP;
    const glowBottom = isDark ? DARK_GLOW_BOTTOM : LIGHT_GLOW_BOTTOM;
    const footerColor = isDark ? DARK_FOOTER : LIGHT_FOOTER;

    useEffect(() => {
        Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }),

        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
        }),

        Animated.timing(translateAnim, {
            toValue: 0,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }),
        ]).start();
    }, [fadeAnim, scaleAnim, translateAnim]);

    return (
        <View style={[styles.container, { backgroundColor: splashBackground }]}>
        <View style={[styles.topGlow, { backgroundColor: glowTop }]} />
        <View style={[styles.bottomGlow, { backgroundColor: glowBottom }]} />

        <Animated.View
            style={[
            styles.content,
            {
                opacity: fadeAnim,
                transform: [
                { scale: scaleAnim },
                { translateY: Animated.add(translateAnim, CONTENT_OFFSET_Y) },
                ],
            },
            ]}
        >
            <View
            style={[
                styles.logoWrap,
                {
                backgroundColor: splashBackground,
                },
            ]}
            >
            <Image
                source={logoSource}
                style={[
                styles.logo,
                {
                    transform: [{ scale: LOGO_ZOOM }],
                },
                ]}
                resizeMode="contain"
            />
            </View>

            <Text style={[styles.subtitle, { color: splashSecondary }]}>
            Preparando tu espacio de trabajo
            </Text>

            <View
            style={[
                styles.loaderBox,
                {
                backgroundColor: splashCard,
                borderColor: splashBorder,
                },
            ]}
            >
            <ActivityIndicator size="small" color={splashPrimary} />

            <Text style={[styles.loaderText, { color: splashSecondary }]}>
                Cargando...
            </Text>
            </View>
        </Animated.View>

        <Text style={[styles.footer, { color: footerColor }]}>
            Panel personal para programadores
        </Text>
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
    },

    topGlow: {
        position: "absolute",
        top: -135,
        right: -125,
        width: 285,
        height: 285,
        borderRadius: 999,
    },

    bottomGlow: {
        position: "absolute",
        bottom: -155,
        left: -140,
        width: 305,
        height: 305,
        borderRadius: 999,
    },

    content: {
        width: "100%",
        alignItems: "center",
    },

    logoWrap: {
        width: 210,
        height: 150,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
    },

    logo: {
        width: 150,
        height: 105,
    },

    subtitle: {
        marginTop: 30,
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: "700",
        textAlign: "center",
    },

    loaderBox: {
        marginTop: 30,
        minWidth: 175,
        height: 48,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,

        shadowColor: "#0F172A",
        shadowOffset: {
        width: 0,
        height: 8,
        },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 0,
    },

    loaderText: {
        marginLeft: 10,
        fontSize: 12.5,
        fontWeight: "800",
    },

    footer: {
        position: "absolute",
        bottom: 75,
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
    },
});