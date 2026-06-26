<?php
/**
 * Plugin Name: Maxxed Local Health Endpoint
 * Description: Exposes a tiny local-only health endpoint for the WordPress harness.
 */

add_action('rest_api_init', function () {
    register_rest_route('maxxed/v1', '/health', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () {
            return rest_ensure_response(array(
                'ok' => true,
                'site_url' => get_site_url(),
                'home_url' => get_home_url(),
                'wp_version' => get_bloginfo('version'),
                'environment' => wp_get_environment_type(),
                'active_theme' => wp_get_theme()->get('Name'),
                'plugin_count' => count(get_plugins()),
            ));
        },
    ));
});
