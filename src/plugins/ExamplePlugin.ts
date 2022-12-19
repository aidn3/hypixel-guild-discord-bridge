import Application from "../Application"
import PluginInterface from "../common/PluginInterface"
import {ClientInstance} from "../common/ClientInstance"

export default <PluginInterface>{
    onRun(app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined): any {
        // modify something e.g:
        //app.ClusterHelper.sendCommandToAllMinecraft("hello there!")
    }
}