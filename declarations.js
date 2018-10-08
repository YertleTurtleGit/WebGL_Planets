'use strict';

const DEBUG_MODE = true;

const DIRTY_SCALING_FACTOR = 2; //1 means no scaling

const VERTICES_COUNT_OF_SPHERE = 32*32
const INDICE_COUNT_OF_SPHERE = 32*32*6

const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
const USHORT_SIZE = Float32Array.BYTES_PER_ELEMENT;

var OBJECT_SCALE = 1.5;
//const SPACE_SCALE = 1.0;
const ROTATION_FACTOR = 0.04;

const MODEL_COUNT = 4;
const SUN_INDEX = 0;
const EARTH_INDEX = 1;
const PLANETX_INDEX = 2;
const MOON_INDEX = 3;

const vec3SUN_POSITION = [0.0, 0.0, 0.0];
const vec3EARTH_POSITION = [-2.5, 0.0, 0.0];
const vec3PLANETX_POSITION = [-3.5, 0.0, 0.0];
const vec3MOON_POSITION = [-2.25, 0.0, 0.0];

const SUN_SCALE = 0.7;
const EARTH_SCALE = 0.2;
const PLANETX_SCALE = 0.125;
const MOON_SCALE = 0.05;

const SUN_SPEED = 0.0;
const EARTH_SPEED = 1.0;
const PLANETX_SPEED = 1.2;
const MOON_SPEED = 2.0;

const vec4SUN_COLOR = [1.0, 1.0, 1.0, 1.0];
const vec4EARTH_COLOR = [0.1, 0.1, 0.1, 1.0];
const vec4PLANETX_COLOR = [0.09, 0.09, 0.09, 1.0];
const vec4MOON_COLOR = [0.1, 0.1, 0.1, 1.0];

const BACKGROUND_COLOR = [0.005, 0.005, 0.005, 1.0];

//const CAMERA_MOVEMENT_FACTOR = -3.0;

const vec3MODEL_POSITIONS = [vec3SUN_POSITION,
                           vec3EARTH_POSITION,
                           vec3PLANETX_POSITION,
                           vec3MOON_POSITION];

const fMODEL_SCALES = [SUN_SCALE,
                     EARTH_SCALE,
                     PLANETX_SCALE,
                     MOON_SCALE];

const fMODEL_SPEEDS = [SUN_SPEED,
                     EARTH_SPEED,
                     PLANETX_SPEED,
                     MOON_SPEED];

const vec4MODEL_COLORS = [vec4SUN_COLOR,
                        vec4EARTH_COLOR,
                        vec4PLANETX_COLOR,
                        vec4MOON_COLOR];

const VERTEX_SHADER_SOURCE =
        [
        '#version 100',

        'attribute vec3 inputPosition;',
        'attribute vec2 inputTexCoord;',
        'attribute vec3 inputNormal;',
        
        'uniform mat4 modelview, normalMat, modelviewProjection;',
        'uniform vec4 inputColor;',

        'uniform float rand;',
        
        'varying vec3 normalInterp;',
        'varying vec3 vertPos;',
        'varying vec4 vertColor;',

        'varying vec2 uv;',

        'void main(){',
            'gl_Position = modelviewProjection * vec4(inputPosition, 1.0);',
            'vec4 vertPos4 = modelviewProjection * vec4(inputPosition, 1.0);',
            'vertPos = vertPos4.xyz / vertPos4.w;',
            'normalInterp = vec3(normalMat * vec4(inputNormal, 0.0));',
            'vertColor = inputColor;',
            'uv = inputTexCoord;',
        '}'    
        ].join('\n');

const FRAGMENT_SHADER_SOURCE =
        [
        '#version 100',

        'precision mediump float;',

        'varying vec3 vertPos;',
        'varying vec3 normalInterp;',
        'varying vec4 vertColor;',

        'varying vec2 uv;',

        'uniform sampler2D frameBufferTextureSampler;',

        'const float lightPower = 7.85;',
        'const vec3 lightColor = vec3(1.0, 1.0, 1.0);',
        'const vec3 lightPos = vec3(0.0, 0.0, 0.0);',
        'const vec3 ambientColor = vec3(0.1, 0.1, 0.1);',
        'const vec3 diffuseColor = vec3(0.25, 0.25, 0.25);',
        'const vec3 specColor = vec3(1.0, 1.0, 1.0);',
        'const float shininess = 16.0;',
        'const float screenGamma = 2.2;',

        'vec4 fragColor;',

        'void main() {',

            'vec3 normal = normalize(normalInterp);',
            'vec3 lightDir = normalize(lightPos - vertPos);',
            'float distance = length(lightDir);',

            'float lambertian = max(dot(lightDir, normal), 0.0);',
            'float specular = 0.0;',

            'if(lambertian > 0.0) {',
                'vec3 viewDir = normalize(-vertPos);',

                'vec3 halfDir = normalize(lightDir + viewDir);',
                'float specAngle = max(dot(halfDir, normal), 0.0);',
                'specular = pow(specAngle, shininess);',
            '}',

            'vec3 colorLinear = ambientColor +',
                                'lambertian * diffuseColor * lightColor * lightPower / distance +',
                                'specular * specColor * lightColor * lightPower / distance;',

            'colorLinear -= lightColor * lightPower * distance * 0.023;',
            'colorLinear += mix(colorLinear, vertColor.rgb, 0.9);',

            'float alpha = 1.0;',

            'vec3 colorGamma = pow(colorLinear, vec3(1.0/screenGamma));',

            'fragColor = vec4(colorGamma, alpha);',
            'gl_FragColor = fragColor;',     
        '}'
        ].join('\n');

const VERTEX_SHADER_POST_PROCESSING_SOURCE =
        [
        '#version 100',

        'attribute vec2 inputPosition;',
        'attribute vec2 inputTexCoord;',

        'varying vec2 uv;',
        'varying vec2 blurCoords[5];',

        'void main(){',
            'gl_Position = vec4(inputPosition, 0.0, 1.0);',
            'uv = inputTexCoord;',

            'vec2 singleStepOffset = vec2(0.002, 0.002);',
            'blurCoords[0] = inputTexCoord.xy;',
            'blurCoords[1] = inputTexCoord.xy + singleStepOffset * 1.407333;',
            'blurCoords[2] = inputTexCoord.xy - singleStepOffset * 1.407333;',
            'blurCoords[3] = inputTexCoord.xy + singleStepOffset * 3.294215;',
            'blurCoords[4] = inputTexCoord.xy - singleStepOffset * 3.294215;',
        '}'    
        ].join('\n');

const FRAGMENT_SHADER_POST_PROCESSING_SOURCE =
        [
        '#version 100',

        'precision mediump float;',

        'varying vec2 uv;',
        'varying vec2 blurCoords[5];',
        'uniform float rand;',

        'uniform sampler2D frameBufferTextureSampler;',

        'vec4 fragColor;',

        'float random (vec2 st) {',
            'return fract(sin(dot(st.xy, vec2(12.9898,78.233)))*43758.5453123);',
        '}',

        'void main() {',
            'vec4 white = vec4(1.0, 1.0, 1.0, 1.0);',
            'vec4 black = vec4(0.5, 0.5, 0.5, 1.0);',
            'fragColor = texture2D(frameBufferTextureSampler, uv);',

            'lowp vec4 sum = vec4(0.0);',
            'sum += texture2D(frameBufferTextureSampler, blurCoords[0]) * 0.204164;',
            'sum += texture2D(frameBufferTextureSampler, blurCoords[1]) * 0.304005;',
            'sum += texture2D(frameBufferTextureSampler, blurCoords[2]) * 0.304005;',
            'sum += texture2D(frameBufferTextureSampler, blurCoords[3]) * 0.093913;',
            'sum += texture2D(frameBufferTextureSampler, blurCoords[4]) * 0.093913;',
            'fragColor += sum;',
            
            'if(rand-(0.3*rand) <= uv.y) {',
                'if(uv.y <= rand+(0.3*rand)) {',
                    'fragColor = mix(texture2D(frameBufferTextureSampler, vec2(uv.x+0.006, uv.y)), black, 0.1 * rand);',
                '}',
            '}',

            'float grain = random(uv.xy/vec2(rand, rand));',
            'fragColor = mix(fragColor, vec4(grain, grain, grain, 1.0), 0.15 + (rand * 0.003));',
            'gl_FragColor = fragColor;',
        '}'
        ].join('\n');