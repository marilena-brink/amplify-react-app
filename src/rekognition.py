import codecs
import json
import boto3
from botocore.config import Config
import time
import binascii
import re

def run_rekognition():

    my_config = Config(
        region_name = 'eu-west-1',
        signature_version = 'v4',
        retries = {
            'max_attempts': 10,
            'mode': 'standard'
        }
    )
    processor_name = 'RekognitionStreamProcessor'

    #session = boto3.Session(profile_name="vs_sdk_lea")
    rekognition_client = boto3.client("rekognition", config=my_config)
    kinesis_archived_client = boto3.client('kinesis-video-archived-media', config=my_config)
    kinesis_client = boto3.client('kinesisvideo', config=my_config)
    kinesis_video_media_client = boto3.client('kinesis-video-media', config=my_config, endpoint_url='https://s-5ac677c0.kinesisvideo.eu-west-1.amazonaws.com'
    )

    check_stream_processors = rekognition_client.list_stream_processors()
    print(check_stream_processors)

    check_stream_processors = rekognition_client.list_stream_processors()
    print(f"lol {check_stream_processors}")

    # delete_response = rekognition_client.delete_stream_processor(
    #     Name="RekognitionStreamProcessor"
    # )
    # print(f"stream processor deleted {delete_response}")

    if ('StreamProcessors' not in check_stream_processors.keys() or ('StreamProcessors' in check_stream_processors.keys() and check_stream_processors['StreamProcessors'][0]['Name'] != processor_name)):

        stream_processing = rekognition_client.create_stream_processor(
        DataSharingPreference= { "OptIn":True
        },
        Input= {
            "KinesisVideoStream": {
            "Arn": "arn:aws:kinesisvideo:eu-west-1:559768431112:stream/OnlyFish/1705501167632"
            }
        },
        Name= processor_name,
        Output= {
            "S3Destination": {
            "Bucket": "rekognitionoutputbucket2",
            "KeyPrefix": "data/"
            }
        },
        NotificationChannel={
        "SNSTopicArn": "arn:aws:sns:eu-west-1:559768431112:OnlyFishNotification"
        },
        RoleArn= "arn:aws:iam::559768431112:role/RekognitionServiceRole",
        Settings= {
            "ConnectedHome": {
            "Labels": [
                "PET"
            ],
            "MinConfidence": 20
            }
        }
        )

        print(f"check stream creation {stream_processing}")

    data_endpoint = kinesis_client.get_data_endpoint(
        StreamARN='arn:aws:kinesisvideo:eu-west-1:559768431112:stream/OnlyFish/1705501167632',
        APIName='GET_MEDIA'
    )

    print(f"dataendpoint {data_endpoint['DataEndpoint']}")

    start_selector = {
        'StartSelectorType'
    }

    frame_response = kinesis_video_media_client.get_media(
        StreamARN='arn:aws:kinesisvideo:eu-west-1:559768431112:stream/OnlyFish/1705501167632',
        StartSelector={'StartSelectorType': 'NOW'},
    )

    payload = frame_response['Payload']


    payload_string = str(payload.read(amt=1024).decode('iso-8859-1'))

    fragment_number = re.split(r'/(\d+)', payload_string)

    print(f"FRAGMENT NUMBER {fragment_number[1]}")

    response =  rekognition_client.start_stream_processor(
        Name=processor_name,
        StartSelector={
            'KVSStreamStartSelector': {
                "FragmentNumber": str(fragment_number[1])
            }
        },
        StopSelector={
            'MaxDurationInSeconds': 30
        }
    )


    check_stream_processors = rekognition_client.list_stream_processors()
    print(f"check stream exists {check_stream_processors}")

    return 'rekognition'

